"use server";

import { refresh } from "next/cache";

import type { ActionResult } from "@/components/actions/types";
import { getActiveMembership } from "@/lib/auth/session";
import { errorKeyFrom } from "@/lib/errors";
import {
  isJpeg,
  MAX_PHOTO_BYTES,
  PHOTO_CONTENT_TYPE,
} from "@/lib/photos/constraints";
import {
  newPhotoPath,
  PHOTOS_BUCKET,
  removePhotoFiles,
} from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";
import { photoIdSchema, photoUploadSchema } from "@/lib/validation/photo";

// Server Actions of photos (ADR 0009). One photo per call: the browser has
// already resized it, so each request stays well under Vercel's 4.5 MB
// limit (next.config.ts raises Next's own limit to 4 MB). Any member can
// add and remove photos.

export async function uploadPhoto(formData: FormData): Promise<ActionResult> {
  const active = await getActiveMembership();
  const parsed = photoUploadSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId") ?? "",
    width: formData.get("width"),
    height: formData.get("height"),
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) {
    return { status: "error", error: "photoInvalid" };
  }
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return { status: "error", error: "photoInvalid" };
  }
  // Check the content, not the name or the type the browser claims.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) return { status: "error", error: "photoInvalid" };

  const { propertyId, roomId, width, height } = parsed.data;
  const supabase = await createClient();

  // The target must be in the active organization; checked before uploading
  // so that a wrong id never leaves a file behind.
  const target = roomId
    ? await supabase
        .from("rooms")
        .select("id")
        .eq("id", roomId)
        .eq("property_id", propertyId)
        .eq("org_id", active.orgId)
        .maybeSingle()
    : await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("org_id", active.orgId)
        .maybeSingle();
  if (target.error) return { status: "error", error: "unexpected" };
  if (!target.data) return { status: "error", error: "notFound" };

  const path = newPhotoPath(active.orgId, propertyId);
  const upload = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: PHOTO_CONTENT_TYPE, upsert: false });
  if (upload.error) return { status: "error", error: "photoInvalid" };

  const { error } = await supabase.from("photos").insert({
    org_id: active.orgId,
    property_id: propertyId,
    room_id: roomId,
    storage_path: path,
    width,
    height,
  });
  if (error) {
    // E.g. the limit of 20 photos: the file must not stay behind.
    await removePhotoFiles(supabase, [path]);
    return { status: "error", error: errorKeyFrom(error) };
  }

  refresh();
  return { status: "success" };
}

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const active = await getActiveMembership();
  if (!photoIdSchema.safeParse(photoId).success) {
    return { status: "error", error: "notFound" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("org_id", active.orgId)
    .select("storage_path");
  if (error) return { status: "error", error: errorKeyFrom(error) };
  const deleted = data[0];
  if (!deleted) return { status: "error", error: "notFound" };

  await removePhotoFiles(supabase, [deleted.storage_path]);
  refresh();
  return { status: "success" };
}
