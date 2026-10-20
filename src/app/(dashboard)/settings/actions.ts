"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/components/actions/types";
import { getActiveMembership, homePath, requireUser } from "@/lib/auth/session";
import { errorKeyFrom } from "@/lib/errors";
import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  formValues,
  type FormState,
} from "@/lib/validation/form";
import {
  changeRoleSchema,
  invitationIdSchema,
  invitationSchema,
  memberIdSchema,
  organizationSchema,
} from "@/lib/validation/organization";

// Server Actions of the settings pages. They always act on the active
// organization (never on an id sent by the browser) and the database
// decides whether the user's role allows it: an update or delete that RLS
// filters out simply affects no rows, which is reported as insufficientRole.

const ORGANIZATION_FIELDS = ["name"] as const;
export type OrganizationSettingsField = (typeof ORGANIZATION_FIELDS)[number];

export async function renameOrganization(
  _previous: FormState<OrganizationSettingsField>,
  formData: FormData,
): Promise<FormState<OrganizationSettingsField>> {
  const active = await getActiveMembership();
  const values = formValues(formData, ORGANIZATION_FIELDS);
  const parsed = organizationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", active.orgId)
    .select("id");
  if (error || data.length === 0) {
    return {
      status: "error",
      error: error ? errorKeyFrom(error) : "insufficientRole",
      values,
    };
  }

  refresh();
  return { status: "success", values: { name: parsed.data.name } };
}

const INVITATION_FIELDS = ["email", "role"] as const;
export type InvitationField = (typeof INVITATION_FIELDS)[number] | "link";

export async function inviteMember(
  _previous: FormState<InvitationField>,
  formData: FormData,
): Promise<FormState<InvitationField>> {
  const active = await getActiveMembership();
  const values = formValues(formData, INVITATION_FIELDS);
  const parsed = invitationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invitation", {
    target_org: active.orgId,
    invitee_email: parsed.data.email,
    invitee_role: parsed.data.role,
  });
  if (error) {
    return { status: "error", error: errorKeyFrom(error), values };
  }

  refresh();
  // The token is only returned now: the database keeps its hash.
  return {
    status: "success",
    values: {
      email: parsed.data.email,
      link: `${await getRequestOrigin()}/invite/${token}`,
    },
  };
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResult> {
  const active = await getActiveMembership();
  const parsed = invitationIdSchema.safeParse({ invitationId });
  if (!parsed.success) return { status: "error", error: "unexpected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.invitationId)
    .eq("org_id", active.orgId)
    .select("id");
  if (error || data.length === 0) {
    return {
      status: "error",
      error: error ? errorKeyFrom(error) : "insufficientRole",
    };
  }

  refresh();
  return { status: "success" };
}

export async function changeMemberRole(
  memberId: string,
  role: string,
): Promise<ActionResult> {
  const active = await getActiveMembership();
  const parsed = changeRoleSchema.safeParse({ memberId, role });
  if (!parsed.success) return { status: "error", error: "unexpected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId)
    .eq("org_id", active.orgId)
    .select("id");
  if (error || data.length === 0) {
    return {
      status: "error",
      error: error ? errorKeyFrom(error) : "insufficientRole",
    };
  }

  refresh();
  return { status: "success" };
}

// Removes a member, or the user themselves (leaving the organization).
export async function removeMember(memberId: string): Promise<ActionResult> {
  const [active, user] = await Promise.all([
    getActiveMembership(),
    requireUser(),
  ]);
  const parsed = memberIdSchema.safeParse({ memberId });
  if (!parsed.success) return { status: "error", error: "unexpected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .delete()
    .eq("id", parsed.data.memberId)
    .eq("org_id", active.orgId)
    .select("user_id");
  if (error || data.length === 0) {
    return {
      status: "error",
      error: error ? errorKeyFrom(error) : "insufficientRole",
    };
  }

  if (data[0]?.user_id === user.id) {
    // Left the organization: on to another one, or to onboarding.
    redirect(await homePath(supabase));
  }
  refresh();
  return { status: "success" };
}
