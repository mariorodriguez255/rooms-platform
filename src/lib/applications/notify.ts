import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { useTranslations } from "next-intl";

import { getEmailSender } from "@/lib/providers/email";
import type { Database } from "@/types/database";

import { candidateConfirmationEmail, newApplicationEmail } from "./emails";

type EmailTranslator = ReturnType<typeof useTranslations<"emails">>;

// Sends the emails of a new (or updated) application: a confirmation to
// the candidate and a notice to every member of the organization. Runs
// after the response (after() in the Server Action), with the secret-key
// client: there is no signed-in user. A failure is logged and never
// undoes the application, which is already stored.
export async function notifyNewApplication(
  supabase: SupabaseClient<Database>,
  t: EmailTranslator,
  { applicationId, origin }: { applicationId: string; origin: string },
): Promise<void> {
  const { data: application, error } = await supabase
    .from("applications")
    .select(
      "id, org_id, candidates (name, email), rooms (name, properties (name, city))",
    )
    .eq("id", applicationId)
    .single();
  if (error) throw error;

  const [organization, members] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, contact_email")
      .eq("id", application.org_id)
      .single(),
    supabase
      .from("members")
      .select("profiles (email)")
      .eq("org_id", application.org_id),
  ]);
  if (organization.error) throw organization.error;
  if (members.error) throw members.error;

  const sender = getEmailSender();
  const candidate = application.candidates;
  const room = application.rooms;
  const messages = [
    candidateConfirmationEmail(t, {
      to: candidate.email,
      candidateName: candidate.name,
      roomName: room.name,
      city: room.properties.city,
      organization: organization.data.name,
      // Applications are only accepted while it is set (submit_application).
      contactEmail: organization.data.contact_email ?? "",
    }),
    ...members.data
      .map((member) => member.profiles.email)
      .filter((email): email is string => Boolean(email))
      .map((email) =>
        newApplicationEmail(t, {
          to: email,
          candidateName: candidate.name,
          roomName: room.name,
          propertyName: room.properties.name,
          organization: organization.data.name,
          link: `${origin}/applications/${application.id}`,
        }),
      ),
  ];

  const results = await Promise.allSettled(
    messages.map((message) => sender.send(message)),
  );
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    // No addresses or content in logs: only what failed and why.
    console.error("Some application emails were not sent", {
      applicationId,
      failed: failed.length,
      total: results.length,
      reason: String((failed[0] as PromiseRejectedResult).reason),
    });
  }
}
