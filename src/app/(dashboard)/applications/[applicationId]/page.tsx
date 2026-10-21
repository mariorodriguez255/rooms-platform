import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { NotFoundNotice } from "@/components/layout/not-found-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readAnswers } from "@/lib/applications/questionnaire";
import { findApplication } from "@/lib/applications/queries";
import { getActiveMembership } from "@/lib/auth/session";
import { isoDateToUtc } from "@/lib/dates";
import { centsToEuros, euroFormatOptions } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { applicationIdSchema } from "@/lib/validation/application";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("applications");
  return { title: t("detailTitle") };
}

// One application, read-only: contact details, answers and consent.
// Ranking, stages and decisions come with milestone 4.
export default function ApplicationPage({
  params,
}: PageProps<"/applications/[applicationId]">) {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ApplicationDetails params={params} />
    </Suspense>
  );
}

async function ApplicationDetails({
  params,
}: Pick<PageProps<"/applications/[applicationId]">, "params">) {
  const [{ applicationId }, active, t, format] = await Promise.all([
    params,
    getActiveMembership(),
    getTranslations(),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const application = applicationIdSchema.safeParse(applicationId).success
    ? await findApplication(supabase, active.orgId, applicationId)
    : null;
  if (!application) {
    return (
      <NotFoundNotice
        message={t("applications.notFound")}
        backHref="/dashboard"
        backLabel={t("dashboard.title")}
      />
    );
  }

  const answers = readAnswers(application.answers);
  const candidate = application.candidates;
  const date = (value: string) =>
    format.dateTime(isoDateToUtc(value), {
      dateStyle: "long",
      timeZone: "UTC",
    });
  const moment = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "long",
      timeStyle: "short",
    });
  const none = t("applications.notAnswered");
  const habit = (value: number | undefined) =>
    value === undefined
      ? none
      : t("applications.habitValue", { value: String(value) });

  const rows: [string, ReactNode][] = [
    [
      t("questionnaire.move_in_date"),
      answers.move_in_date ? date(answers.move_in_date) : none,
    ],
    [
      t("questionnaire.stay_months"),
      answers.stay_months === undefined
        ? none
        : answers.stay_months >= 24
          ? t("questionnaire.stayMonthsMax")
          : t("questionnaire.stayMonths", { months: answers.stay_months }),
    ],
    [
      t("questionnaire.occupation"),
      answers.occupation
        ? t(`questionnaire.occupations.${answers.occupation}`)
        : none,
    ],
    [
      t("questionnaire.monthly_income"),
      answers.monthly_income === undefined
        ? none
        : t("applications.income", {
            amount: format.number(
              centsToEuros(answers.monthly_income * 100),
              euroFormatOptions(answers.monthly_income * 100),
            ),
          }),
    ],
    [
      t("questionnaire.schedule"),
      answers.schedule
        ? t(`questionnaire.schedules.${answers.schedule}`)
        : none,
    ],
    [
      t("questionnaire.remote_work"),
      answers.remote_work
        ? t(`questionnaire.remoteWork.${answers.remote_work}`)
        : none,
    ],
    [t("questionnaire.habits.cleanliness.label"), habit(answers.cleanliness)],
    [t("questionnaire.habits.noise.label"), habit(answers.noise)],
    [t("questionnaire.habits.visits.label"), habit(answers.visits)],
    [t("questionnaire.habits.common_areas.label"), habit(answers.common_areas)],
    [
      t("questionnaire.smoking"),
      answers.smoking
        ? t(`questionnaire.smokingOptions.${answers.smoking}`)
        : none,
    ],
    [
      t("questionnaire.pets"),
      answers.pets === undefined
        ? none
        : t(answers.pets ? "questionnaire.yes" : "questionnaire.no"),
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/rooms/${application.room_id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {application.rooms.name}
        </Link>
        <h1 className="text-2xl font-semibold">{candidate.name}</h1>
        <p className="text-muted-foreground">
          {t("applications.forRoom", {
            room: application.rooms.name,
            property: application.rooms.properties.name,
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          {application.updated_at !== application.created_at
            ? t("applications.updated", {
                date: moment(application.updated_at),
              })
            : t("applications.received", {
                date: moment(application.created_at),
              })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("applications.contact")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <a
            href={`mailto:${candidate.email}`}
            className="underline underline-offset-4"
          >
            {candidate.email}
          </a>
          {candidate.phone ? (
            <a
              href={`tel:${candidate.phone}`}
              className="underline underline-offset-4"
            >
              {candidate.phone}
            </a>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("applications.answers")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {answers.introduction ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm text-muted-foreground">
                {t("questionnaire.introduction")}
              </h3>
              <p className="whitespace-pre-line">{answers.introduction}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("applications.consent")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          {application.consents.map((consent) => (
            <p key={consent.accepted_at}>
              {t("applications.consentGiven", {
                date: moment(consent.accepted_at),
                version: consent.text_version,
              })}
            </p>
          ))}
          {answers.adult_declared ? (
            <p>{t("applications.adultDeclared")}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
