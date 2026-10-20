"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/components/actions/types";
import { HOME_PATH } from "@/lib/auth/routes";
import { requireUser, setActiveOrganization } from "@/lib/auth/session";
import { errorKeyFrom } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { invitationTokenSchema } from "@/lib/validation/organization";

export async function acceptInvitation(token: string): Promise<ActionResult> {
  await requireUser();
  const parsed = invitationTokenSchema.safeParse(token);
  if (!parsed.success) return { status: "error", error: "invitationInvalid" };

  // The function checks expiry, revocation and that the invitation is for
  // the current user's confirmed email.
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", {
    invitation_token: parsed.data,
  });
  if (error) return { status: "error", error: errorKeyFrom(error) };

  await setActiveOrganization(orgId);
  redirect(HOME_PATH);
}
