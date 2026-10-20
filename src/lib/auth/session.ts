import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { MemberRole } from "@/lib/auth/permissions";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Data Access Layer: the only place that reads the session. Pages and
// Server Actions call these functions instead of reading cookies directly.
// cache() deduplicates the work within a single request.

export const ACTIVE_ORG_COOKIE = "active_org";
export const ONBOARDING_PATH = "/onboarding";

export type CurrentUser = {
  id: string;
  email: string;
};

export type Membership = {
  orgId: string;
  orgName: string;
  role: MemberRole;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: claims.email ?? "" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

// Organizations of the current user, oldest membership first.
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("role, organizations (id, name)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  return data.map((row) => ({
    orgId: row.organizations.id,
    orgName: row.organizations.name,
    role: row.role,
  }));
});

// The organization the user is working in: the one in the active_org cookie
// if they still belong to it, otherwise their first one. The cookie only
// chooses among the user's memberships, so tampering with it gains nothing.
export const findActiveMembership = cache(
  async (): Promise<Membership | null> => {
    const memberships = await getMemberships();
    const cookieStore = await cookies();
    const wanted = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
    return (
      memberships.find((m) => m.orgId === wanted) ?? memberships[0] ?? null
    );
  },
);

// Same, for pages that need an organization: without any, the user goes to
// onboarding to create one.
export async function getActiveMembership(): Promise<Membership> {
  const active = await findActiveMembership();
  if (!active) redirect(ONBOARDING_PATH);
  return active;
}

export async function setActiveOrganization(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
