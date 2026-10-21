import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canEditOrganization } from "@/lib/auth/permissions";
import { getActiveMembership } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { OrganizationForm } from "./organization-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.organization");
  return { title: t("title") };
}

export default async function OrganizationSettingsPage() {
  const t = await getTranslations("settings.organization");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t("title")}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<ContentSkeleton />}>
          <OrganizationSettings />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function OrganizationSettings() {
  const [active, t] = await Promise.all([
    getActiveMembership(),
    getTranslations("settings.organization"),
  ]);
  const editable = canEditOrganization(active.role);
  const supabase = await createClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("contact_email")
    .eq("id", active.orgId)
    .single();
  if (error) throw error;
  return (
    <div className="flex flex-col gap-6">
      <CardDescription>
        {editable ? t("description") : t("readOnly")}
      </CardDescription>
      {/* key: reset the form when switching organization. */}
      <OrganizationForm
        key={active.orgId}
        name={active.orgName}
        contactEmail={organization.contact_email ?? ""}
        editable={editable}
      />
    </div>
  );
}
