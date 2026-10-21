import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { ConfirmActionDialog } from "@/components/actions/confirm-action-dialog";
import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { NotFoundNotice } from "@/components/layout/not-found-notice";
import { RoomStateBadge } from "@/components/rooms/room-state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canDeletePropertiesAndRooms } from "@/lib/auth/permissions";
import { getActiveMembership } from "@/lib/auth/session";
import { todayInSpain } from "@/lib/dates";
import { centsToEuros, euroFormatOptions } from "@/lib/money";
import { getBoardState } from "@/lib/rooms/board-state";
import { findProperty } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import { propertyIdSchema } from "@/lib/validation/property";

import { deleteProperty } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("detailTitle") };
}

export default function PropertyPage({
  params,
}: PageProps<"/properties/[propertyId]">) {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <PropertyDetails params={params} />
    </Suspense>
  );
}

async function PropertyDetails({
  params,
}: Pick<PageProps<"/properties/[propertyId]">, "params">) {
  const [{ propertyId }, active, t, format] = await Promise.all([
    params,
    getActiveMembership(),
    getTranslations(),
    getFormatter(),
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

  const today = todayInSpain();
  const euros = (cents: number) =>
    format.number(centsToEuros(cents), euroFormatOptions(cents));
  const rentSum = property.rooms.reduce(
    (sum, room) => sum + room.price_cents,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/properties"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t("properties.backToList")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{property.name}</h1>
            <p className="text-muted-foreground">
              {property.address} · {property.city} ·{" "}
              {t(`regions.${property.region}`)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/properties/${property.id}/edit`}>
                {t("common.edit")}
              </Link>
            </Button>
            {canDeletePropertiesAndRooms(active.role) ? (
              <ConfirmActionDialog
                triggerLabel={t("properties.delete")}
                title={t("properties.deleteTitle", { name: property.name })}
                description={t("properties.deleteDescription")}
                confirmLabel={t("properties.delete")}
                action={deleteProperty.bind(null, property.id)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>
              <h2>{t("properties.roomsTitle")}</h2>
            </CardTitle>
            {property.rooms.length > 0 ? (
              <CardDescription>
                {t("properties.rentSum", { amount: euros(rentSum) })}
                {property.total_rent_reference_cents !== null
                  ? ` · ${t("properties.rentReference", {
                      amount: euros(property.total_rent_reference_cents),
                    })}`
                  : null}
              </CardDescription>
            ) : null}
          </div>
          <Button size="sm" asChild>
            <Link href={`/properties/${property.id}/rooms/new`}>
              {t("dashboard.addRoom")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {property.rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.propertyWithoutRooms")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {property.rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
                >
                  <Link
                    href={`/rooms/${room.id}`}
                    className="font-medium hover:underline"
                  >
                    {room.name}
                  </Link>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {t("rooms.pricePerMonth", {
                        amount: euros(room.price_cents),
                      })}
                    </span>
                    <RoomStateBadge
                      state={getBoardState(room, today)}
                      today={today}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
