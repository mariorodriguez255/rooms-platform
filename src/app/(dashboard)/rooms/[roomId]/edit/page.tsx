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
import { centsToInput } from "@/lib/money";
import { formatDecimalInput } from "@/lib/numbers";
import { featuresFromJson } from "@/lib/rooms/features";
import { findRoom } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import { roomIdSchema } from "@/lib/validation/property";

import { updateRoom } from "../../actions";
import { RoomForm } from "../../room-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rooms");
  return { title: t("title") };
}

export default function EditRoomPage({
  params,
}: PageProps<"/rooms/[roomId]/edit">) {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <EditRoom params={params} />
    </Suspense>
  );
}

async function EditRoom({
  params,
}: Pick<PageProps<"/rooms/[roomId]/edit">, "params">) {
  const [{ roomId }, active, t] = await Promise.all([
    params,
    getActiveMembership(),
    getTranslations(),
  ]);
  const supabase = await createClient();
  const room = roomIdSchema.safeParse(roomId).success
    ? await findRoom(supabase, active.orgId, roomId)
    : null;
  if (!room) {
    return (
      <NotFoundNotice
        message={t("rooms.notFound")}
        backHref="/dashboard"
        backLabel={t("dashboard.title")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t("rooms.editTitle", { name: room.name })}</h1>
        </CardTitle>
        <CardDescription>
          {t("rooms.inProperty", { property: room.properties.name })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoomForm
          action={updateRoom.bind(null, room.id)}
          defaults={{
            name: room.name,
            price: centsToInput(room.price_cents),
            deposit: centsToInput(room.deposit_cents),
            // numeric(5,1): one decimal at most, so tenths are exact.
            size:
              room.size_m2 === null
                ? ""
                : formatDecimalInput(Math.round(room.size_m2 * 10), 1),
            status: room.status,
            availableFrom: room.available_from ?? "",
            features: featuresFromJson(room.features).join(","),
          }}
          submitLabel={t("common.save")}
          cancelHref={`/rooms/${room.id}`}
        />
      </CardContent>
    </Card>
  );
}
