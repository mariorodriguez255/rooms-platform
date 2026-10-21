import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { NotFoundNotice } from "@/components/layout/not-found-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";
import { centsToInput } from "@/lib/money";
import { findProperty } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import { propertyIdSchema } from "@/lib/validation/property";

import { updateProperty } from "../../actions";
import { PropertyForm } from "../../property-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("detailTitle") };
}

export default function EditPropertyPage({
  params,
}: PageProps<"/properties/[propertyId]/edit">) {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <EditProperty params={params} />
    </Suspense>
  );
}

async function EditProperty({
  params,
}: Pick<PageProps<"/properties/[propertyId]/edit">, "params">) {
  const [{ propertyId }, active, t] = await Promise.all([
    params,
    getActiveMembership(),
    getTranslations(),
  ]);
  const supabase = await createClient();
  const property = propertyIdSchema.safeParse(propertyId).success
    ? await findProperty(supabase, active.orgId, propertyId)
    : null;
  if (!property) {
    return (
      <NotFoundNotice
        message={t("properties.notFound")}
        backHref="/properties"
        backLabel={t("properties.backToList")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t("properties.editTitle", { name: property.name })}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PropertyForm
          action={updateProperty.bind(null, property.id)}
          defaults={{
            name: property.name,
            address: property.address,
            city: property.city,
            region: property.region,
            totalRentReference: centsToInput(
              property.total_rent_reference_cents,
            ),
          }}
          submitLabel={t("common.save")}
          cancelHref={`/properties/${property.id}`}
        />
      </CardContent>
    </Card>
  );
}
