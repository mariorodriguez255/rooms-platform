import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONSENT_VERSION } from "@/lib/applications/consent";
import {
  ANSWER_KEYS,
  applicationFormSchema,
  toAnswers,
} from "@/lib/applications/questionnaire";
import { fieldErrorsFrom } from "@/lib/validation/form";
import messages from "@/messages/es.json";

const TODAY = "2026-10-21";
const schema = applicationFormSchema(TODAY);

const valid = {
  name: " Elena Candidata ",
  email: "Elena@Example.org",
  phone: "+34 600 123 456",
  move_in_date: "2026-12-01",
  stay_months: "6",
  occupation: "worker",
  monthly_income: "1.200",
  schedule: "morning",
  remote_work: "sometimes",
  cleanliness: "4",
  noise: "2",
  visits: "2",
  common_areas: "3",
  smoking: "outside",
  pets: "no",
  introduction: "  Trabajo en una oficina y busco un piso tranquilo. ",
  adult_declared: "on",
  consent: "on",
};

describe("the allow-list of answers", () => {
  // Briefing §9: only cohabitation, dates and money. Changing this list is a
  // deliberate decision: update the migration, the messages and this test.
  it("is exactly the approved list", () => {
    expect([...ANSWER_KEYS]).toEqual([
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
    ]);
  });

  it("matches the check constraint of the database", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    const file = readdirSync(dir).find((name) =>
      name.endsWith("_applications.sql"),
    );
    const sql = readFileSync(join(dir, file!), "utf8");
    const list = /answers - array\[([^\]]+)\]/.exec(sql)?.[1] ?? "";
    const keys = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(keys).toEqual([...ANSWER_KEYS]);
  });

  it("only ever stores allow-listed keys, whatever the form sends", () => {
    const parsed = schema.parse({
      ...valid,
      nationality: "x",
      religion: "y",
      birth_date: "2000-01-01",
    });
    const answers = toAnswers(parsed);
    for (const key of Object.keys(answers)) {
      expect(ANSWER_KEYS).toContain(key);
    }
    expect(answers).not.toHaveProperty("nationality");
  });
});

describe("applicationFormSchema", () => {
  it("parses the form into contact details and answers", () => {
    const parsed = schema.parse(valid);
    expect(parsed.name).toBe("Elena Candidata");
    expect(parsed.email).toBe("elena@example.org");
    expect(parsed.phone).toBe("+34 600 123 456");
    expect(toAnswers(parsed)).toEqual({
      move_in_date: "2026-12-01",
      stay_months: 6,
      occupation: "worker",
      monthly_income: 1200,
      schedule: "morning",
      remote_work: "sometimes",
      cleanliness: 4,
      noise: 2,
      visits: 2,
      common_areas: 3,
      smoking: "outside",
      pets: false,
      introduction: "Trabajo en una oficina y busco un piso tranquilo.",
      adult_declared: true,
    });
  });

  it("leaves out optional answers left empty", () => {
    const answers = toAnswers(
      schema.parse({
        ...valid,
        phone: "",
        monthly_income: "",
        introduction: " ",
      }),
    );
    expect(answers).not.toHaveProperty("monthly_income");
    expect(answers).not.toHaveProperty("introduction");
  });

  it("accepts move-in dates from today to a year later", () => {
    const at = (move_in_date: string) =>
      schema.safeParse({ ...valid, move_in_date }).success;
    expect(at("2026-10-21")).toBe(true);
    expect(at("2027-10-21")).toBe(true);
    expect(at("2026-10-20")).toBe(false);
    expect(at("2027-10-22")).toBe(false);
  });

  it("reports every field with a translatable key", () => {
    const result = schema.safeParse({
      name: "",
      email: "nope",
      phone: "abc",
      move_in_date: "2026-02-30",
      stay_months: "5",
      occupation: "unemployed",
      monthly_income: "1200,50",
      schedule: "",
      remote_work: "always",
      cleanliness: "0",
      noise: "6",
      visits: "",
      common_areas: "x",
      smoking: "",
      pets: "",
      introduction: "x".repeat(1001),
      adult_declared: "",
      consent: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      name: "required",
      email: "emailInvalid",
      phone: "phoneInvalid",
      move_in_date: "dateInvalid",
      stay_months: "chooseOption",
      occupation: "chooseOption",
      monthly_income: "incomeInvalid",
      schedule: "chooseOption",
      remote_work: "chooseOption",
      cleanliness: "chooseOption",
      noise: "chooseOption",
      visits: "chooseOption",
      common_areas: "chooseOption",
      smoking: "chooseOption",
      pets: "chooseOption",
      introduction: "introductionTooLong",
      adult_declared: "adultRequired",
      consent: "consentRequired",
    });
    for (const issue of result.error.issues) {
      expect(messages.validation).toHaveProperty(issue.message);
    }
  });
});

describe("questionnaire and consent texts", () => {
  it("has a question for every answer", () => {
    for (const key of ANSWER_KEYS) {
      if (key === "adult_declared") continue; // part of the consent block
      if (["cleanliness", "noise", "visits", "common_areas"].includes(key)) {
        expect(messages.questionnaire.habits).toHaveProperty(key);
      } else {
        expect(messages.questionnaire).toHaveProperty(key);
      }
    }
  });

  it("has every part of the current consent text", () => {
    expect(Object.keys(messages.consent[CONSENT_VERSION]).sort()).toEqual(
      [
        "adult",
        "checkbox",
        "controller",
        "legalBasis",
        "processor",
        "purpose",
        "retention",
        "rights",
      ].sort(),
    );
  });
});
