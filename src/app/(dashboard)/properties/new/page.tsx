import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("newTitle") };
}

// The form needs no data: the action reads the active organization.
export default async function NewPropertyPage() {
  const t = await getTranslations("properties");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t("newTitle")}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PropertyForm
          action={createProperty}
          submitLabel={t("create")}
          cancelHref="/properties"
        />
      </CardContent>
    </Card>
  );
}
