import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";
import { todayInSpain } from "@/lib/dates";
import { centsToEuros, euroFormatOptions } from "@/lib/money";
import { getBoardGroup, getBoardState } from "@/lib/rooms/board-state";
import { listPropertiesWithRooms } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("title") };
}

export default async function PropertiesPage() {
  const t = await getTranslations("properties");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/properties/new">{t("add")}</Link>
        </Button>
      </div>
      <Suspense fallback={<ContentSkeleton />}>
        <PropertyList />
      </Suspense>
    </div>
  );
}

async function PropertyList() {
  const [active, t, format] = await Promise.all([
    getActiveMembership(),
    getTranslations(),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const properties = await listPropertiesWithRooms(supabase, active.orgId);
  const today = todayInSpain();

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>{t("properties.empty")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {properties.map((property) => {
        const free = property.rooms.filter(
          (room) => getBoardGroup(getBoardState(room, today)) === "free",
        ).length;
        const rentSum = property.rooms.reduce(
          (sum, room) => sum + room.price_cents,
          0,
        );
        return (
          <li key={property.id}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  <Link
                    href={`/properties/${property.id}`}
                    className="hover:underline"
                  >
                    {property.name}
                  </Link>
                </CardTitle>
                <CardDescription className="flex flex-col gap-1">
                  <span>{property.city}</span>
                  <span>
                    {t("properties.roomCount", {
                      count: property.rooms.length,
                    })}
                    {property.rooms.length > 0
                      ? ` · ${t("properties.freeCount", { count: free })}`
                      : null}
                  </span>
                  {property.rooms.length > 0 ? (
                    <span>
                      {t("properties.rentSum", {
                        amount: format.number(
                          centsToEuros(rentSum),
                          euroFormatOptions(rentSum),
                        ),
                      })}
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
