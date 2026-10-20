import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { FormError } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { invitationTokenSchema } from "@/lib/validation/organization";

import { AcceptInvitation, SwitchAccount } from "./invite-actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invite");
  return { title: t("title") };
}

// Needs a session (the proxy sends visitors to /login?next=/invite/…, and
// from there they can sign up). It does not need an organization.
export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const t = await getTranslations("invite");
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>{t("title")}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground">…</p>}>
            <InvitationDetails params={params} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function InvitationDetails({
  params,
}: Pick<PageProps<"/invite/[token]">, "params">) {
  const [{ token }, t, tRoles] = await Promise.all([
    params,
    getTranslations("invite"),
    getTranslations("roles"),
    requireUser(),
  ]);

  const parsed = invitationTokenSchema.safeParse(token);
  const supabase = await createClient();
  const { data, error } = parsed.success
    ? await supabase.rpc("get_invitation", { invitation_token: parsed.data })
    : { data: [], error: null };
  if (error) return <FormError error="unexpected" />;

  const invitation = data[0];
  if (!invitation) return <p>{t("notFound")}</p>;

  if (invitation.status === "pending" && invitation.email_matches) {
    return (
      <div className="flex flex-col gap-4">
        <p>
          {t("pending", {
            organization: invitation.org_name,
            role: tRoles(invitation.role).toLowerCase(),
          })}
        </p>
        <AcceptInvitation token={token} label={t("accept")} />
      </div>
    );
  }

  if (invitation.status === "pending") {
    return (
      <div className="flex flex-col gap-4">
        <p>{t("emailMismatch")}</p>
        <SwitchAccount
          next={`/invite/${token}`}
          label={t("signOutAndSwitch")}
        />
      </div>
    );
  }

  const message = {
    expired: t("expired"),
    revoked: t("revoked"),
    accepted: t("accepted"),
  }[invitation.status as "expired" | "revoked" | "accepted"];

  return (
    <div className="flex flex-col gap-4">
      <p>{message ?? t("notFound")}</p>
      <Button asChild variant="outline" className="self-start">
        <Link href="/dashboard">{t("goToDashboard")}</Link>
      </Button>
    </div>
  );
}
