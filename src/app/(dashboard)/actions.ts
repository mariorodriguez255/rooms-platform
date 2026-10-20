"use server";

import { redirect } from "next/navigation";

import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";
import {
  getMemberships,
  requireUser,
  setActiveOrganization,
} from "@/lib/auth/session";
import { errorKeyFrom } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  formValues,
  type FormState,
} from "@/lib/validation/form";
import {
  organizationIdSchema,
  organizationSchema,
} from "@/lib/validation/organization";

const ORGANIZATION_FIELDS = ["name"] as const;
export type OrganizationField = (typeof ORGANIZATION_FIELDS)[number];

export async function createOrganization(
  _previous: FormState<OrganizationField>,
  formData: FormData,
): Promise<FormState<OrganizationField>> {
  await requireUser();
  const values = formValues(formData, ORGANIZATION_FIELDS);
  const parsed = organizationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  // One RPC creates the organization and the owner membership together.
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
  });
  if (error) {
    return { status: "error", error: errorKeyFrom(error), values };
  }

  await setActiveOrganization(orgId);
  redirect(HOME_PATH);
}

export async function switchOrganization(orgId: string): Promise<void> {
  const parsed = organizationIdSchema.safeParse({ orgId });
  // Only to an organization the user belongs to; anything else is ignored.
  const memberships = await getMemberships();
  if (
    parsed.success &&
    memberships.some((m) => m.orgId === parsed.data.orgId)
  ) {
    await setActiveOrganization(parsed.data.orgId);
  }
  redirect(HOME_PATH);
}

export async function signOut(next?: string): Promise<void> {
  const supabase = await createClient();
  // scope "local": signs out this browser only, not the user's other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect(
    next ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}` : LOGIN_PATH,
  );
}
