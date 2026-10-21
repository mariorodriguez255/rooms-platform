import { z } from "zod";

import { daysBetween, isIsoDate } from "@/lib/dates";
import { parseDecimal } from "@/lib/numbers";
import { emailSchema } from "@/lib/validation/auth";

// Allow-list of everything the public form asks (briefing §9): only
// cohabitation, dates and money. Never nationality, ethnic origin,
// religion, sex, sexual orientation, health or age (only that the person
// is an adult). The database enforces the same keys
// (supabase/migrations/…_applications.sql; a unit test keeps both in sync).
// Adding a question means adding it here, there and to the messages, and
// checking it against that rule. See ADR 0010.

export const ANSWER_KEYS = [
  "move_in_date",
  "stay_months",
  "occupation",
  "monthly_income",
  "schedule",
  "remote_work",
  "cleanliness",
  "noise",
  "visits",
  "common_areas",
  "smoking",
  "pets",
  "introduction",
  "adult_declared",
] as const;

export type AnswerKey = (typeof ANSWER_KEYS)[number];

// 24 means "two years or more".
export const STAY_MONTHS = [1, 2, 3, 6, 9, 12, 18, 24] as const;
export const OCCUPATIONS = [
  "student",
  "worker",
  "student_worker",
  "other",
] as const;
export const SCHEDULES = ["morning", "afternoon", "night", "variable"] as const;
export const REMOTE_WORK = ["no", "sometimes", "mostly"] as const;
export const SMOKING = ["no", "outside", "yes"] as const;
// Cohabitation habits, from 1 to 5.
export const HABITS = [
  "cleanliness",
  "noise",
  "visits",
  "common_areas",
] as const;
export const HABIT_VALUES = [1, 2, 3, 4, 5] as const;

export const MAX_MONTHLY_INCOME = 100_000;
export const MAX_INTRODUCTION_LENGTH = 1000;
export const MAX_MOVE_IN_DAYS = 365;

export type Answers = {
  move_in_date: string;
  stay_months: (typeof STAY_MONTHS)[number];
  occupation: (typeof OCCUPATIONS)[number];
  monthly_income?: number;
  schedule: (typeof SCHEDULES)[number];
  remote_work: (typeof REMOTE_WORK)[number];
  cleanliness: number;
  noise: number;
  visits: number;
  common_areas: number;
  smoking: (typeof SMOKING)[number];
  pets: boolean;
  introduction?: string;
  adult_declared: true;
};

// Fields of the public form: the answers plus contact details and consent.
export const APPLICATION_FIELDS = [
  "name",
  "email",
  "phone",
  ...ANSWER_KEYS,
  "consent",
] as const;

export type ApplicationField = (typeof APPLICATION_FIELDS)[number];

const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, "chooseOption");

const habitSchema = z.coerce
  .number("chooseOption")
  .refine(
    (value) => HABIT_VALUES.some((allowed) => allowed === value),
    "chooseOption",
  );

// Schema of the form for a given day (an ISO date in Spain): the move-in
// date must be between that day and a year later. Error messages are keys
// of the "validation" messages.
export function applicationFormSchema(today: string) {
  return z.object({
    name: z.string().trim().min(1, "required").max(100, "tooLong"),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\+?[0-9 ()-]{6,30}$/.test(value),
        "phoneInvalid",
      )
      .transform((value) => value || null),
    move_in_date: z
      .string()
      .trim()
      .min(1, "required")
      .refine(isIsoDate, "dateInvalid")
      .refine((value) => {
        const days = daysBetween(today, value);
        return days >= 0 && days <= MAX_MOVE_IN_DAYS;
      }, "moveInDateRange"),
    stay_months: z.coerce
      .number("chooseOption")
      .refine(
        (value): value is Answers["stay_months"] =>
          STAY_MONTHS.some((allowed) => allowed === value),
        "chooseOption",
      ),
    occupation: choice(OCCUPATIONS),
    // Optional: left empty, it never counts against the candidate.
    monthly_income: z
      .string()
      .trim()
      .transform((value, ctx) => {
        if (value === "") return null;
        const euros = parseDecimal(value, 0);
        if (euros === null || euros > MAX_MONTHLY_INCOME) {
          ctx.addIssue({ code: "custom", message: "incomeInvalid" });
          return z.NEVER;
        }
        return euros;
      }),
    schedule: choice(SCHEDULES),
    remote_work: choice(REMOTE_WORK),
    cleanliness: habitSchema,
    noise: habitSchema,
    visits: habitSchema,
    common_areas: habitSchema,
    smoking: choice(SMOKING),
    pets: z.enum(["yes", "no"], "chooseOption").transform((v) => v === "yes"),
    introduction: z
      .string()
      .trim()
      .max(MAX_INTRODUCTION_LENGTH, "introductionTooLong")
      .transform((value) => value || null),
    // Checkboxes send "on" when ticked and nothing otherwise.
    adult_declared: z.literal("on", "adultRequired"),
    consent: z.literal("on", "consentRequired"),
  });
}

export type ApplicationForm = z.infer<ReturnType<typeof applicationFormSchema>>;

// The answers to store: only allow-listed keys; optional ones are left out
// when empty.
export function toAnswers(form: ApplicationForm): Answers {
  return {
    move_in_date: form.move_in_date,
    stay_months: form.stay_months as Answers["stay_months"],
    occupation: form.occupation,
    ...(form.monthly_income !== null
      ? { monthly_income: form.monthly_income }
      : {}),
    schedule: form.schedule,
    remote_work: form.remote_work,
    cleanliness: form.cleanliness,
    noise: form.noise,
    visits: form.visits,
    common_areas: form.common_areas,
    smoking: form.smoking,
    pets: form.pets,
    ...(form.introduction !== null ? { introduction: form.introduction } : {}),
    adult_declared: true,
  };
}

// Reads stored answers for display. They were validated on the way in,
// but `answers` is JSON to TypeScript: anything unexpected is dropped
// instead of breaking the page.
const storedAnswersSchema = z.object({
  move_in_date: z.string().optional().catch(undefined),
  stay_months: z.number().optional().catch(undefined),
  occupation: z.enum(OCCUPATIONS).optional().catch(undefined),
  monthly_income: z.number().optional().catch(undefined),
  schedule: z.enum(SCHEDULES).optional().catch(undefined),
  remote_work: z.enum(REMOTE_WORK).optional().catch(undefined),
  cleanliness: z.number().optional().catch(undefined),
  noise: z.number().optional().catch(undefined),
  visits: z.number().optional().catch(undefined),
  common_areas: z.number().optional().catch(undefined),
  smoking: z.enum(SMOKING).optional().catch(undefined),
  pets: z.boolean().optional().catch(undefined),
  introduction: z.string().optional().catch(undefined),
  adult_declared: z.boolean().optional().catch(undefined),
});

export type StoredAnswers = z.infer<typeof storedAnswersSchema>;

export function readAnswers(json: unknown): StoredAnswers {
  const result = storedAnswersSchema.safeParse(json);
  return result.success ? result.data : {};
}
