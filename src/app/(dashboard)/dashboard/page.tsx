import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {/* Session data streams in; the title is part of the static shell. */}
      <Suspense fallback={<ContentSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const [active, t] = await Promise.all([
    getActiveMembership(),
    getTranslations("dashboard"),
  ]);
  return (
    <>
      <p className="text-muted-foreground">
        {t("welcome", { organization: active.orgName })}
      </p>
      {/* Placeholder until milestone 2 (properties and rooms). */}
      <Card>
        <CardHeader>
          <CardTitle>{t("emptyTitle")}</CardTitle>
          <CardDescription>{t("emptyDescription")}</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
