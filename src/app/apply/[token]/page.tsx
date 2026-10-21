import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/layout/content-skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isoDateToUtc, todayInSpain } from "@/lib/dates";
import { centsToEuros, euroFormatOptions } from "@/lib/money";
import { signPhotoUrls } from "@/lib/photos/storage";
import { featuresFromJson } from "@/lib/rooms/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomTokenSchema } from "@/lib/validation/application";

import { ApplicationForm } from "./application-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return {
    title: t("title"),
    // A link meant for candidates, not for search engines.
    robots: { index: false, follow: false },
    // The token is in the URL: never send it to other sites.
    referrer: "no-referrer",
  };
}

// Public page of a room, for candidates without an account (milestone 3).
// Data comes from get_public_room(), which only service_role can call: the
// page runs on the server with the secret key and shows only what that
// function returns (never the address). See ADR 0010.
export default function ApplyPage({ params }: PageProps<"/apply/[token]">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-8">
      <Suspense fallback={<ContentSkeleton />}>
        <PublicRoom params={params} />
      </Suspense>
    </main>
  );
}

async function PublicRoom({
  params,
}: Pick<PageProps<"/apply/[token]">, "params">) {
  const [{ token }, t, format] = await Promise.all([
    params,
    getTranslations(),
    getFormatter(),
  ]);

  const supabase = await createAdminClient();
  const { data, error } = roomTokenSchema.safeParse(token).success
    ? await supabase.rpc("get_public_room", { room_token: token })
    : { data: [], error: null };
  if (error) throw error;
  const room = data[0];

  if (!room) {
    return (
      <Notice title={t("apply.notFoundTitle")} message={t("apply.notFound")} />
    );
  }
  if (!room.accepting) {
    return (
      <Notice title={t("apply.closedTitle")} message={t("apply.closed")} />
    );
  }

  const photos = Array.isArray(room.photos)
    ? (room.photos as { path: string; width: number; height: number }[])
    : [];
  const urls = await signPhotoUrls(
    supabase,
    photos.map((photo) => photo.path),
  );
  const today = todayInSpain();
  const euros = (cents: number) =>
    format.number(centsToEuros(cents), euroFormatOptions(cents));
  const availability =
    room.available_from && room.available_from > today
      ? t("apply.availableFrom", {
          date: format.dateTime(isoDateToUtc(room.available_from), {
            dateStyle: "long",
            timeZone: "UTC",
          }),
        })
      : room.status === "vacant"
        ? t("apply.availableNow")
        : null;
  const details = [
    t("apply.price", { amount: euros(room.price_cents) }),
    room.deposit_cents !== null
      ? t("apply.deposit", { amount: euros(room.deposit_cents) })
      : null,
    room.size_m2 !== null
      ? t("apply.size", { size: format.number(room.size_m2) })
      : null,
  ].filter((detail) => detail !== null);
  const features = featuresFromJson(room.features);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{room.room_name}</h1>
        <p className="text-muted-foreground">
          {t("apply.place", {
            city: room.city,
            region: t(`regions.${room.region}`),
          })}
        </p>
        <p className="font-medium">{details.join(" · ")}</p>
        {availability ? <p className="text-sm">{availability}</p> : null}
        <p className="text-sm text-muted-foreground">
          {t("apply.managedBy", { organization: room.org_name })}
        </p>
      </header>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((photo, index) => {
            const url = urls.get(photo.path);
            if (!url) return null;
            return (
              <li key={photo.path} className={index === 0 ? "col-span-2" : ""}>
                <Image
                  src={url}
                  alt={t("apply.photoAlt", {
                    index: index + 1,
                    room: room.room_name,
                  })}
                  width={photo.width}
                  height={photo.height}
                  unoptimized
                  loading={index === 0 ? "eager" : "lazy"}
                  className="aspect-[4/3] w-full rounded-md bg-muted object-cover"
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      {features.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {features.map((feature) => (
            <li key={feature} className="rounded-full border px-3 py-1 text-sm">
              {t(`roomFeatures.${feature}`)}
            </li>
          ))}
        </ul>
      ) : null}

      <ApplicationForm
        token={token}
        today={today}
        organization={room.org_name}
        contactEmail={room.contact_email ?? ""}
      />
    </>
  );
}

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{title}</h1>
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
