"use client";

import { CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  CheckboxField,
  RadioGroupField,
  TextAreaField,
} from "@/components/forms/choice-fields";
import { FormError } from "@/components/forms/form-alert";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { CONSENT_VERSION } from "@/lib/applications/consent";
import {
  HABIT_VALUES,
  HABITS,
  MAX_INTRODUCTION_LENGTH,
  OCCUPATIONS,
  REMOTE_WORK,
  SCHEDULES,
  SMOKING,
  STAY_MONTHS,
  type ApplicationField,
} from "@/lib/applications/questionnaire";
import { initialFormState } from "@/lib/validation/form";

import { submitApplication, type ApplyState } from "./actions";

// The candidate's form, designed for phones: one column, native controls,
// sections with legends. It works before JavaScript loads (a plain form
// post to the Server Action).
export function ApplicationForm({
  token,
  today,
  organization,
  contactEmail,
}: {
  token: string;
  // ISO date in Spain, for the earliest move-in date.
  today: string;
  organization: string;
  contactEmail: string;
}) {
  const t = useTranslations();
  const [state, formAction] = useActionState(
    submitApplication.bind(null, token),
    initialFormState as ApplyState,
  );

  if (state.status === "success") {
    return (
      <Card role="status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheckIcon aria-hidden className="text-emerald-600" />
            <h2>{t("apply.sentTitle")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            {t("apply.sent", {
              name: state.values?.name ?? "",
              organization,
              email: state.values?.email ?? "",
            })}
          </p>
        </CardContent>
      </Card>
    );
  }

  const value = (field: ApplicationField) => state.values?.[field] ?? "";
  const error = (field: ApplicationField) => state.fieldErrors?.[field];
  const choose = t("questionnaire.choose");
  const consent = `consent.${CONSENT_VERSION}` as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("apply.formTitle")}</h2>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("apply.formIntro")}</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate>
          <FieldGroup>
            <FormError error={state.error} />

            {/* Honeypot: hidden from people and screen readers. */}
            <div
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            >
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <FieldSet>
              <FieldLegend>{t("apply.sections.contact")}</FieldLegend>
              <TextField
                name="name"
                label={t("apply.name")}
                autoComplete="name"
                required
                maxLength={100}
                defaultValue={value("name")}
                error={error("name")}
              />
              <TextField
                name="email"
                type="email"
                label={t("apply.email")}
                autoComplete="email"
                required
                defaultValue={value("email")}
                error={error("email")}
              />
              <TextField
                name="phone"
                type="tel"
                label={t("apply.phone")}
                autoComplete="tel"
                defaultValue={value("phone")}
                error={error("phone")}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("apply.sections.stay")}</FieldLegend>
              <TextField
                name="move_in_date"
                type="date"
                label={t("questionnaire.move_in_date")}
                required
                min={today}
                defaultValue={value("move_in_date")}
                error={error("move_in_date")}
                className="w-fit"
              />
              <SelectField
                key={`stay_months-${value("stay_months")}`}
                name="stay_months"
                label={t("questionnaire.stay_months")}
                placeholder={choose}
                options={STAY_MONTHS.map((months) => ({
                  value: String(months),
                  label:
                    months === 24
                      ? t("questionnaire.stayMonthsMax")
                      : t("questionnaire.stayMonths", { months }),
                }))}
                required
                defaultValue={value("stay_months")}
                error={error("stay_months")}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("apply.sections.life")}</FieldLegend>
              <SelectField
                key={`occupation-${value("occupation")}`}
                name="occupation"
                label={t("questionnaire.occupation")}
                placeholder={choose}
                options={OCCUPATIONS.map((option) => ({
                  value: option,
                  label: t(`questionnaire.occupations.${option}`),
                }))}
                required
                defaultValue={value("occupation")}
                error={error("occupation")}
              />
              <TextField
                name="monthly_income"
                label={t("questionnaire.monthly_income")}
                description={t("questionnaire.monthlyIncomeHelp")}
                inputMode="numeric"
                defaultValue={value("monthly_income")}
                error={error("monthly_income")}
                className="max-w-40"
              />
              <SelectField
                key={`schedule-${value("schedule")}`}
                name="schedule"
                label={t("questionnaire.schedule")}
                placeholder={choose}
                options={SCHEDULES.map((option) => ({
                  value: option,
                  label: t(`questionnaire.schedules.${option}`),
                }))}
                required
                defaultValue={value("schedule")}
                error={error("schedule")}
              />
              <SelectField
                key={`remote_work-${value("remote_work")}`}
                name="remote_work"
                label={t("questionnaire.remote_work")}
                placeholder={choose}
                options={REMOTE_WORK.map((option) => ({
                  value: option,
                  label: t(`questionnaire.remoteWork.${option}`),
                }))}
                required
                defaultValue={value("remote_work")}
                error={error("remote_work")}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("apply.sections.habits")}</FieldLegend>
              <p className="text-sm text-muted-foreground">
                {t("questionnaire.habitsHelp")}
              </p>
              {HABITS.map((habit) => (
                <RadioGroupField
                  key={`${habit}-${value(habit)}`}
                  name={habit}
                  legend={t(`questionnaire.habits.${habit}.label`)}
                  inline
                  hint={{
                    start: t(`questionnaire.habits.${habit}.min`),
                    end: t(`questionnaire.habits.${habit}.max`),
                  }}
                  options={HABIT_VALUES.map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                  defaultValue={value(habit)}
                  error={error(habit)}
                />
              ))}
              <RadioGroupField
                key={`smoking-${value("smoking")}`}
                name="smoking"
                legend={t("questionnaire.smoking")}
                options={SMOKING.map((option) => ({
                  value: option,
                  label: t(`questionnaire.smokingOptions.${option}`),
                }))}
                defaultValue={value("smoking")}
                error={error("smoking")}
              />
              <RadioGroupField
                key={`pets-${value("pets")}`}
                name="pets"
                legend={t("questionnaire.pets")}
                options={[
                  { value: "no", label: t("questionnaire.no") },
                  { value: "yes", label: t("questionnaire.yes") },
                ]}
                defaultValue={value("pets")}
                error={error("pets")}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("apply.sections.about")}</FieldLegend>
              <TextAreaField
                key={`introduction-${value("introduction").length}`}
                name="introduction"
                label={t("questionnaire.introduction")}
                description={t("questionnaire.introductionHelp")}
                maxLength={MAX_INTRODUCTION_LENGTH}
                defaultValue={value("introduction")}
                error={error("introduction")}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("apply.sections.privacy")}</FieldLegend>
              <ul className="flex flex-col gap-2 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                <li>{t(`${consent}.controller`, { organization })}</li>
                <li>{t(`${consent}.purpose`)}</li>
                <li>{t(`${consent}.legalBasis`)}</li>
                <li>{t(`${consent}.processor`, { organization })}</li>
                <li>{t(`${consent}.retention`)}</li>
                <li>{t(`${consent}.rights`, { email: contactEmail })}</li>
              </ul>
              <CheckboxField
                key={`adult-${value("adult_declared")}`}
                name="adult_declared"
                label={t(`${consent}.adult`)}
                defaultChecked={value("adult_declared") === "on"}
                error={error("adult_declared")}
              />
              <CheckboxField
                key={`consent-${value("consent")}`}
                name="consent"
                label={t(`${consent}.checkbox`, { organization })}
                defaultChecked={value("consent") === "on"}
                error={error("consent")}
              />
            </FieldSet>

            <SubmitButton size="lg" className="w-full sm:w-auto">
              {t("apply.submit")}
            </SubmitButton>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
