import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Files of the private `photos` bucket (supabase/migrations/…_photos_storage
// .sql and ADR 0009). Every call uses the signed-in user's client, so the
// Storage policies apply: only members of the organization in the first
// folder of the path can read, upload or delete.

type Client = SupabaseClient<Database>;

export const PHOTOS_BUCKET = "photos";

// Long enough to browse a page; short enough that a copied link soon stops
// working.
export const SIGNED_URL_SECONDS = 60 * 60;

// <org_id>/<property_id>/<random uuid>.jpg: the database checks this shape.
export function newPhotoPath(orgId: string, propertyId: string): string {
  return `${orgId}/${propertyId}/${crypto.randomUUID()}.jpg`;
}

// Signed URLs for many photos in one request, by storage path.
export async function signPhotoUrls(
  supabase: Client,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  const urls = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}

// Deletes files after their rows are gone. Rows come first because they are
// what the app shows: if this fails, the file is left orphaned (invisible,
// still inside the organization's folder) rather than a broken photo
// remaining on the page. Supabase warns never to delete them with SQL.
export async function removePhotoFiles(
  supabase: Client,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
  if (error) {
    console.error("Could not remove photo files", {
      count: paths.length,
      error: error.message,
    });
  }
}
