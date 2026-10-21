import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { RoomStateBadge } from "@/components/rooms/room-state-badge";
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
import {
  BOARD_GROUPS,
  countByGroup,
  FREEING_SOON_DAYS,
  getBoardGroup,
  getBoardState,
  isBoardGroup,
  type BoardGroup,
} from "@/lib/rooms/board-state";
import { listPropertiesWithRooms } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

// The room board: every room of the organization with its state, grouped
// by property ("done when" of milestone 2). Filters are plain links
// (?status=free), so they work without JavaScript.
export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const t = await getTranslations("dashboard");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {/* Session data streams in; the title is part of the static shell. */}
      <Suspense fallback={<ContentSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({
  searchParams,
}: Pick<PageProps<"/dashboard">, "searchParams">) {
  const [{ status }, active, t, format] = await Promise.all([
    searchParams,
    getActiveMembership(),
    getTranslations(),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const properties = await listPropertiesWithRooms(supabase, active.orgId);
  const today = todayInSpain();
  const filter: BoardGroup | null = isBoardGroup(status) ? status : null;

  if (properties.length === 0) {
    return (
      <>
        <p className="text-muted-foreground">
          {t("dashboard.welcome", { organization: active.orgName })}
        </p>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.emptyTitle")}</CardTitle>
            <CardDescription>{t("dashboard.emptyDescription")}</CardDescription>
            <Button className="mt-2 w-fit" asChild>
              <Link href="/properties/new">{t("dashboard.addProperty")}</Link>
            </Button>
          </CardHeader>
        </Card>
      </>
    );
  }

  const sections = properties.map((property) => ({
    property,
    rooms: property.rooms.map((room) => ({
      room,
      state: getBoardState(room, today),
    })),
  }));
  const counts = countByGroup(
    sections.flatMap((section) => section.rooms.map((item) => item.state)),
  );
  const total = BOARD_GROUPS.reduce((sum, group) => sum + counts[group], 0);
  const visible = sections
    .map((section) => ({
      ...section,
      rooms: filter
        ? section.rooms.filter((item) => getBoardGroup(item.state) === filter)
        : section.rooms,
    }))
    // With a filter, hide properties that have nothing to show.
    .filter((section) => !filter || section.rooms.length > 0);

  const filters: { group: BoardGroup | null; count: number }[] = [
    { group: null, count: total },
    ...BOARD_GROUPS.map((group) => ({ group, count: counts[group] })),
  ];

  return (
    <>
      <p className="text-muted-foreground">
        {t("dashboard.welcome", { organization: active.orgName })}
      </p>

      <nav
        aria-label={t("dashboard.filterLabel")}
        className="flex flex-col gap-2"
      >
        <ul className="flex flex-wrap gap-2">
          {filters.map(({ group, count }) => {
            const current = group === filter;
            return (
              <li key={group ?? "all"}>
                <Button
                  variant={current ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link
                    href={group ? `/dashboard?status=${group}` : "/dashboard"}
                    aria-current={current ? "page" : undefined}
                  >
                    {t(`dashboard.groups.${group ?? "all"}`)}
                    <span className="tabular-nums opacity-80">{count}</span>
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.soonHelp", { days: FREEING_SOON_DAYS })}
        </p>
      </nav>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">
          {t("dashboard.noRoomsInFilter")}
        </p>
      ) : (
        visible.map(({ property, rooms }) => (
          <section
            key={property.id}
            aria-labelledby={`property-${property.id}`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2
                id={`property-${property.id}`}
                className="text-lg font-medium"
              >
                <Link
                  href={`/properties/${property.id}`}
                  className="hover:underline"
                >
                  {property.name}
                </Link>{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {property.city}
                </span>
              </h2>
              <Link
                href={`/properties/${property.id}/rooms/new`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("dashboard.addRoom")}
              </Link>
            </div>
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.propertyWithoutRooms")}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map(({ room, state }) => (
                  <li key={room.id}>
                    <Link
                      href={`/rooms/${room.id}`}
                      className="flex h-full flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{room.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {t("rooms.pricePerMonth", {
                          amount: format.number(
                            centsToEuros(room.price_cents),
                            euroFormatOptions(room.price_cents),
                          ),
                        })}
                      </span>
                      <RoomStateBadge state={state} today={today} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </>
  );
}
