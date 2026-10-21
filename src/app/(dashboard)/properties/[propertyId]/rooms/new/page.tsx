import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { NotFoundNotice } from "@/components/layout/not-found-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";
import { findProperty } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import { propertyIdSchema } from "@/lib/validation/property";

import { createRoom } from "@/app/(dashboard)/rooms/actions";
import { RoomForm } from "@/app/(dashboard)/rooms/room-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rooms");
  return { title: t("newTitle") };
}

export default function NewRoomPage({
  params,
}: PageProps<"/properties/[propertyId]/rooms/new">) {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <NewRoom params={params} />
    </Suspense>
  );
}

async function NewRoom({
  params,
}: Pick<PageProps<"/properties/[propertyId]/rooms/new">, "params">) {
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
          <h1>{t("rooms.newTitle")}</h1>
        </CardTitle>
        <CardDescription>
          {t("rooms.inProperty", { property: property.name })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoomForm
          action={createRoom.bind(null, property.id)}
          submitLabel={t("rooms.create")}
          cancelHref={`/properties/${property.id}`}
        />
      </CardContent>
    </Card>
  );
}
