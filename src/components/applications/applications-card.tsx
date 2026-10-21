import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readAnswers } from "@/lib/applications/questionnaire";
import { listRoomApplications } from "@/lib/applications/queries";
import { isoDateToUtc } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// Read-only list of a room's applications, newest first. Ranking and
// stages come with the pipeline (milestone 4).
export async function ApplicationsCard({
  orgId,
  roomId,
}: {
  orgId: string;
  roomId: string;
}) {
  const [t, format] = await Promise.all([
    getTranslations("applications"),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const applications = await listRoomApplications(supabase, orgId, roomId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>
            {t("listTitle")}{" "}
            <span className="font-normal text-muted-foreground">
              {applications.length}
            </span>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {applications.map((application) => {
              const moveIn = readAnswers(application.answers).move_in_date;
              return (
                <li
                  key={application.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <Link
                    href={`/applications/${application.id}`}
                    className="font-medium hover:underline"
                  >
                    {application.candidates.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {moveIn
                      ? `${t("moveIn", {
                          date: format.dateTime(isoDateToUtc(moveIn), {
                            dateStyle: "medium",
                            timeZone: "UTC",
                          }),
                        })} · `
                      : null}
                    {t("received", {
                      date: format.dateTime(new Date(application.created_at), {
                        dateStyle: "medium",
                      }),
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
