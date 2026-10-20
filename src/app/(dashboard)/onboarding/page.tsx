import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CreateOrganizationForm } from "./create-organization-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

// Fully static: the proxy guarantees a session, and the Server Action
// checks it again on submit.
export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>{t("title")}</h1>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <CreateOrganizationForm />
      </CardContent>
    </Card>
  );
}
