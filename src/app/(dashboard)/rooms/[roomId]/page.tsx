import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { ConfirmActionDialog } from "@/components/actions/confirm-action-dialog";
import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { NotFoundNotice } from "@/components/layout/not-found-notice";
import { RoomStateBadge } from "@/components/rooms/room-state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canDeletePropertiesAndRooms } from "@/lib/auth/permissions";
import { getActiveMembership } from "@/lib/auth/session";
import { todayInSpain } from "@/lib/dates";
import { centsToEuros, euroFormatOptions } from "@/lib/money";
import { getBoardState } from "@/lib/rooms/board-state";
import { featuresFromJson } from "@/lib/rooms/features";
import { findRoom } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import { roomIdSchema } from "@/lib/validation/property";

import { deleteRoom } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rooms");
  return { title: t("title") };
}

export default function RoomPage({ params }: PageProps<"/rooms/[roomId]">) {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <RoomDetails params={params} />
    </Suspense>
  );
}

async function RoomDetails({
  params,
}: Pick<PageProps<"/rooms/[roomId]">, "params">) {
  const [{ roomId }, active, t, format] = await Promise.all([
    params,
    getActiveMembership(),
    getTranslations(),
    getFormatter(),
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

  const today = todayInSpain();
  const euros = (cents: number) =>
    format.number(centsToEuros(cents), euroFormatOptions(cents));
  const features = featuresFromJson(room.features);
  const details = [
    t("rooms.pricePerMonth", { amount: euros(room.price_cents) }),
    room.deposit_cents !== null
      ? t("rooms.depositValue", { amount: euros(room.deposit_cents) })
      : null,
    room.size_m2 !== null
      ? t("rooms.sizeValue", { size: format.number(room.size_m2) })
      : null,
  ].filter((detail) => detail !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/properties/${room.property_id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {room.properties.name}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{room.name}</h1>
            <RoomStateBadge state={getBoardState(room, today)} today={today} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/rooms/${room.id}/edit`}>{t("common.edit")}</Link>
            </Button>
            {canDeletePropertiesAndRooms(active.role) ? (
              <ConfirmActionDialog
                triggerLabel={t("rooms.delete")}
                title={t("rooms.deleteTitle", { name: room.name })}
                description={t("rooms.deleteDescription")}
                confirmLabel={t("rooms.delete")}
                action={deleteRoom.bind(null, room.id)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="font-medium">{details.join(" · ")}</p>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">{t("rooms.features")}</h2>
            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("rooms.noFeatures")}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-full border px-3 py-1 text-sm"
                  >
                    {t(`roomFeatures.${feature}`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("rooms.photosTitle")}</h2>
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
