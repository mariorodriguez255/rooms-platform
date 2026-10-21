"use server";

import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { after } from "next/server";

import { CONSENT_VERSION } from "@/lib/applications/consent";
import { clientIp, hashIp } from "@/lib/applications/ip";
import { notifyNewApplication } from "@/lib/applications/notify";
import {
  APPLICATION_FIELDS,
  applicationFormSchema,
  toAnswers,
  type ApplicationField,
} from "@/lib/applications/questionnaire";
import { todayInSpain } from "@/lib/dates";
import type { ErrorKey } from "@/lib/errors";
import { getRequestOrigin } from "@/lib/request-origin";
import { getIpHashSecret } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fieldErrorsFrom,
  formValues,
  type FormState,
} from "@/lib/validation/form";
import { roomTokenSchema } from "@/lib/validation/application";

// The public form's only way into the database (ADR 0010). Anyone on the
// internet can call it, so it trusts nothing: honeypot, validation with the
// allow-list, rate limits (inside submit_application) and the secret key
// used only for that one function.

export type ApplyState = FormState<ApplicationField>;

// Codes raised by submit_application.
const SUBMIT_ERRORS = new Map<string, ErrorKey>([
  ["room_not_found", "applicationLinkInvalid"],
  ["room_closed", "applicationClosed"],
  ["rate_limited", "rateLimited"],
]);

export async function submitApplication(
  token: string,
  _previous: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const values = formValues(formData, APPLICATION_FIELDS);
  const sent: ApplyState = {
    status: "success",
    values: { name: values.name.trim(), email: values.email.trim() },
  };

  // Honeypot: a field people never see. Bots that fill it get a success
  // page and nothing is stored.
  const trap = formData.get("website");
  if (typeof trap === "string" && trap !== "") return sent;

  if (!roomTokenSchema.safeParse(token).success) {
    return { status: "error", error: "applicationLinkInvalid", values };
  }
  const parsed = applicationFormSchema(todayInSpain()).safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const ip = clientIp(await headers());
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("submit_application", {
    room_token: token,
    candidate_email: parsed.data.email,
    candidate_name: parsed.data.name,
    answers: toAnswers(parsed.data),
    consent_version: CONSENT_VERSION,
    ...(parsed.data.phone ? { candidate_phone: parsed.data.phone } : {}),
    // Without a known IP, only the per-email limit applies.
    ...(ip ? { client_ip_hash: hashIp(ip, getIpHashSecret()) } : {}),
  });
  const application = data?.[0];
  if (error || !application) {
    const key = error ? SUBMIT_ERRORS.get(error.message) : undefined;
    if (!key) {
      console.error("Could not store an application", { code: error?.code });
    }
    return { status: "error", error: key ?? "unexpected", values };
  }

  // Emails go out after the response: the candidate does not wait for them.
  const [t, origin] = await Promise.all([
    getTranslations("emails"),
    getRequestOrigin(),
  ]);
  after(async () => {
    try {
      await notifyNewApplication(supabase, t, {
        applicationId: application.application_id,
        origin,
      });
    } catch (notifyError) {
      console.error("Could not send the application emails", {
        applicationId: application.application_id,
        reason: String(notifyError),
      });
    }
  });

  return {
    status: "success",
    values: { name: parsed.data.name, email: parsed.data.email },
  };
}
