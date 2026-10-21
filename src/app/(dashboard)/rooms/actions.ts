"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/components/actions/types";
import { getActiveMembership } from "@/lib/auth/session";
import { errorKeyFrom, type ErrorKey } from "@/lib/errors";
import { removePhotoFiles } from "@/lib/photos/storage";
import { featuresToJson } from "@/lib/rooms/features";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  formValues,
  type FormState,
} from "@/lib/validation/form";
import {
  propertyIdSchema,
  roomIdSchema,
  roomSchema,
} from "@/lib/validation/property";

// Server Actions of rooms. They act on the active organization; RLS and the
// composite foreign key keep a room inside the organization of its property.

const ROOM_TEXT_FIELDS = [
  "name",
  "price",
  "deposit",
  "size",
  "status",
  "availableFrom",
] as const;
export type RoomField = (typeof ROOM_TEXT_FIELDS)[number] | "features";

type PostgrestErrorLike = { code?: string; message?: string };

function roomErrorKey(error: PostgrestErrorLike): ErrorKey {
  // 23505: the only unique constraint a user can hit is (property_id, name).
  // 23503: the property is not in this organization (or no longer exists).
  if (error.code === "23505") return "roomNameTaken";
  if (error.code === "23503") return "notFound";
  return errorKeyFrom(error);
}

function parseForm(formData: FormData) {
  const features = formData
    .getAll("features")
    .filter((value): value is string => typeof value === "string");
  const text = formValues(formData, ROOM_TEXT_FIELDS);
  // Checkboxes are refilled from a comma-separated list after an error.
  const values: Partial<Record<RoomField, string>> = {
    ...text,
    features: features.join(","),
  };
  return { values, parsed: roomSchema.safeParse({ ...text, features }) };
}

export async function createRoom(
  propertyId: string,
  _previous: FormState<RoomField>,
  formData: FormData,
): Promise<FormState<RoomField>> {
  const active = await getActiveMembership();
  const { values, parsed } = parseForm(formData);
  if (!propertyIdSchema.safeParse(propertyId).success) {
    return { status: "error", error: "notFound", values };
  }
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      org_id: active.orgId,
      property_id: propertyId,
      name: parsed.data.name,
      price_cents: parsed.data.price,
      deposit_cents: parsed.data.deposit,
      size_m2: parsed.data.size,
      features: featuresToJson(parsed.data.features),
      status: parsed.data.status,
      available_from: parsed.data.availableFrom,
    })
    .select("id")
    .single();
  if (error) return { status: "error", error: roomErrorKey(error), values };

  redirect(`/rooms/${data.id}`);
}

export async function updateRoom(
  roomId: string,
  _previous: FormState<RoomField>,
  formData: FormData,
): Promise<FormState<RoomField>> {
  const active = await getActiveMembership();
  const { values, parsed } = parseForm(formData);
  if (!roomIdSchema.safeParse(roomId).success) {
    return { status: "error", error: "notFound", values };
  }
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .update({
      name: parsed.data.name,
      price_cents: parsed.data.price,
      deposit_cents: parsed.data.deposit,
      size_m2: parsed.data.size,
      features: featuresToJson(parsed.data.features),
      status: parsed.data.status,
      available_from: parsed.data.availableFrom,
    })
    .eq("id", roomId)
    .eq("org_id", active.orgId)
    .select("id");
  if (error) return { status: "error", error: roomErrorKey(error), values };
  // Every member can edit, so no row means it is not in this organization.
  if (data.length === 0) return { status: "error", error: "notFound", values };

  redirect(`/rooms/${roomId}`);
}

// Deletes a room with its photos (owners and admins).
export async function deleteRoom(roomId: string): Promise<ActionResult> {
  const active = await getActiveMembership();
  if (!roomIdSchema.safeParse(roomId).success) {
    return { status: "error", error: "notFound" };
  }

  const supabase = await createClient();
  const photos = await supabase
    .from("photos")
    .select("storage_path")
    .eq("room_id", roomId)
    .eq("org_id", active.orgId);
  if (photos.error) return { status: "error", error: "unexpected" };

  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId)
    .eq("org_id", active.orgId)
    .select("property_id");
  const deleted = data?.[0];
  if (error || !deleted) {
    // 23503: it has applications (they keep it from being deleted).
    if (error?.code === "23503") {
      return { status: "error", error: "roomHasApplications" };
    }
    return {
      status: "error",
      error: error ? errorKeyFrom(error) : "insufficientRole",
    };
  }

  await removePhotoFiles(
    supabase,
    photos.data.map((photo) => photo.storage_path),
  );
  redirect(`/properties/${deleted.property_id}`);
}

// Replaces the room's public link: the previous one stops working at once.
export async function rotateRoomToken(roomId: string): Promise<ActionResult> {
  await getActiveMembership();
  if (!roomIdSchema.safeParse(roomId).success) {
    return { status: "error", error: "notFound" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("rotate_room_token", {
    target_room: roomId,
  });
  if (error) {
    return {
      status: "error",
      error: error.message === "not_found" ? "notFound" : errorKeyFrom(error),
    };
  }

  refresh();
  return { status: "success" };
}
