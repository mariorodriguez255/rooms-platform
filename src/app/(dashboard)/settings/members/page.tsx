import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ConfirmActionDialog } from "@/components/actions/confirm-action-dialog";
import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  assignableRoles,
  canManageMembers,
  canRemoveMember,
} from "@/lib/auth/permissions";
import { getActiveMembership, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { removeMember, revokeInvitation } from "../actions";
import { InviteForm } from "./invite-form";
import { RoleSelect } from "./role-select";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.members");
  return { title: t("title") };
}

export default async function MembersPage() {
  const t = await getTranslations("settings.members");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Suspense fallback={<ContentSkeleton />}>
        <Members />
      </Suspense>
    </div>
  );
}

async function Members() {
  const [user, active, t, format] = await Promise.all([
    requireUser(),
    getActiveMembership(),
    getTranslations(),
    getFormatter(),
  ]);
  const manager = canManageMembers(active.role);
  const supabase = await createClient();

  const [membersResult, invitationsResult] = await Promise.all([
    supabase
      .from("members")
      .select("id, role, user_id, profiles (full_name, email)")
      .eq("org_id", active.orgId)
      .order("created_at"),
    // RLS hides invitations from staff anyway; skip the query for them.
    manager
      ? supabase
          .from("invitations")
          .select("id, email, role, expires_at")
          .eq("org_id", active.orgId)
          .is("accepted_at", null)
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (invitationsResult.error) throw invitationsResult.error;

  const members = membersResult.data;
  const invitations = invitationsResult.data;
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardDescription>
            {t("settings.members.description", {
              organization: active.orgName,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y">
            {members.map((member) => {
              const isSelf = member.user_id === user.id;
              const name =
                member.profiles.full_name ?? member.profiles.email ?? "—";
              const roles = assignableRoles(active.role, member.role);
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
                >
                  <div className="flex min-w-0 flex-1 basis-56 flex-col">
                    <span className="font-medium">
                      {name}{" "}
                      {isSelf ? (
                        <span className="font-normal text-muted-foreground">
                          {t("settings.members.you")}
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {member.profiles.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {roles.length > 0 ? (
                      <RoleSelect
                        memberId={member.id}
                        role={member.role}
                        options={roles}
                        label={t("settings.members.changeRole", { name })}
                      />
                    ) : (
                      <Badge variant="secondary">
                        {t(`roles.${member.role}`)}
                      </Badge>
                    )}
                    {isSelf ? (
                      <ConfirmActionDialog
                        triggerLabel={t("settings.members.leaveShort")}
                        title={t("settings.members.leaveTitle", {
                          organization: active.orgName,
                        })}
                        description={t("settings.members.leaveDescription")}
                        confirmLabel={t("settings.members.leave")}
                        action={removeMember.bind(null, member.id)}
                      />
                    ) : canRemoveMember(active.role, member.role) ? (
                      <ConfirmActionDialog
                        triggerLabel={t("settings.members.remove")}
                        title={t("settings.members.removeTitle", { name })}
                        description={t("settings.members.removeDescription", {
                          organization: active.orgName,
                        })}
                        confirmLabel={t("settings.members.remove")}
                        action={removeMember.bind(null, member.id)}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">
            {t("settings.members.rolesHelp")}
          </p>
        </CardContent>
      </Card>

      {manager ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("settings.invitations.title")}</h2>
              </CardTitle>
              <CardDescription>
                {t("settings.invitations.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("settings.invitations.pendingTitle")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("settings.invitations.noPending")}
                </p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {invitations.map((invitation) => {
                    const expiresAt = new Date(invitation.expires_at);
                    return (
                      <li
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {invitation.email}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t(`roles.${invitation.role}`)} ·{" "}
                            {expiresAt <= now
                              ? t("settings.invitations.expired")
                              : t("settings.invitations.expires", {
                                  date: format.dateTime(expiresAt, {
                                    dateStyle: "medium",
                                  }),
                                })}
                          </span>
                        </div>
                        <ConfirmActionDialog
                          triggerLabel={t("settings.invitations.revoke")}
                          title={t("settings.invitations.revoke")}
                          description={invitation.email}
                          confirmLabel={t("settings.invitations.revoke")}
                          action={revokeInvitation.bind(null, invitation.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
