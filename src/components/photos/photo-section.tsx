import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { deletePhoto } from "@/app/(dashboard)/photos/actions";
import { ConfirmActionDialog } from "@/components/actions/confirm-action-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_PHOTOS_PER_SET } from "@/lib/photos/constraints";
import { signPhotoUrls } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";

import { PhotoUploader } from "./photo-uploader";

// Photos of a room, or of the common areas of a property (roomId null):
// the grid with signed URLs, delete buttons and the uploader.
export async function PhotoSection({
  orgId,
  propertyId,
  roomId,
  title,
  description,
  subject,
}: {
  orgId: string;
  propertyId: string;
  roomId: string | null;
  title: string;
  description?: string;
  // Name used in the alt text of each photo.
  subject: string;
}) {
  const t = await getTranslations("photos");
  const supabase = await createClient();
  const query = supabase
    .from("photos")
    .select("id, storage_path, width, height")
    .eq("org_id", orgId)
    .eq("property_id", propertyId)
    .order("created_at");
  const { data: photos, error } = await (roomId
    ? query.eq("room_id", roomId)
    : query.is("room_id", null));
  if (error) throw error;

  // Private bucket: each photo is shown through a URL that expires in an
  // hour (ADR 0009).
  const urls = await signPhotoUrls(
    supabase,
    photos.map((photo) => photo.storage_path),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>
          {description ? `${description} ` : null}
          {t("count", { count: photos.length, max: MAX_PHOTOS_PER_SET })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((photo, index) => {
              const url = urls.get(photo.storage_path);
              return (
                <li key={photo.id} className="flex flex-col gap-1">
                  {url ? (
                    // unoptimized: signed URLs change on every visit, so
                    // Vercel's image optimization could not cache them.
                    <Image
                      src={url}
                      alt={t("alt", { index: index + 1, name: subject })}
                      width={photo.width}
                      height={photo.height}
                      unoptimized
                      // The first one may be the largest image in view.
                      loading={index === 0 ? "eager" : "lazy"}
                      className="aspect-[4/3] w-full rounded-md bg-muted object-cover"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full rounded-md bg-muted" />
                  )}
                  <div className="self-end">
                    <ConfirmActionDialog
                      triggerLabel={t("delete")}
                      title={t("deleteTitle")}
                      description={t("deleteDescription")}
                      confirmLabel={t("delete")}
                      action={deletePhoto.bind(null, photo.id)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <PhotoUploader
          propertyId={propertyId}
          roomId={roomId}
          remaining={MAX_PHOTOS_PER_SET - photos.length}
        />
      </CardContent>
    </Card>
  );
}
