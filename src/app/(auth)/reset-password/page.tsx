import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

// Reached from the recovery email: /auth/confirm signs the user in and
// redirects here. Without a session the proxy sends them to /login.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t("title")}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
