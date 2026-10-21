"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/components/actions/types";
import { getActiveMembership } from "@/lib/auth/session";
import { errorKeyFrom, type ErrorKey } from "@/lib/errors";
import { removePhotoFiles } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  formValues,
  type FormState,
} from "@/lib/validation/form";
import { propertyIdSchema, propertySchema } from "@/lib/validation/property";

// Server Actions of properties. Like every action, they act on the active
// organization and let RLS decide what the role allows (ADR 0004/0008).

const PROPERTY_FIELDS = [
  "name",
  "address",
  "city",
  "region",
  "totalRentReference",
] as const;
export type PropertyField = (typeof PROPERTY_FIELDS)[number];

type PostgrestErrorLike = { code?: string; message?: string };

function propertyErrorKey(error: PostgrestErrorLike): ErrorKey {
  // The only unique constraint a user can hit is (org_id, name).
  return error.code === "23505" ? "propertyNameTaken" : errorKeyFrom(error);
}

function parseForm(formData: FormData) {
  const values = formValues(formData, PROPERTY_FIELDS);
  return { values, parsed: propertySchema.safeParse(values) };
}

export async function createProperty(
  _previous: FormState<PropertyField>,
  formData: FormData,
): Promise<FormState<PropertyField>> {
  const active = await getActiveMembership();
  const { values, parsed } = parseForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      org_id: active.orgId,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      region: parsed.data.region,
      total_rent_reference_cents: parsed.data.totalRentReference,
    })
    .select("id")
    .single();
  if (error) {
    return { status: "error", error: propertyErrorKey(error), values };
  }

  redirect(`/properties/${data.id}`);
}

export async function updateProperty(
  propertyId: string,
  _previous: FormState<PropertyField>,
  formData: FormData,
): Promise<FormState<PropertyField>> {
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
    .from("properties")
    .update({
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      region: parsed.data.region,
      total_rent_reference_cents: parsed.data.totalRentReference,
    })
    .eq("id", propertyId)
    .eq("org_id", active.orgId)
    .select("id");
  if (error) {
    return { status: "error", error: propertyErrorKey(error), values };
  }
  // Every member can edit, so no row means it is not in this organization.
  if (data.length === 0) return { status: "error", error: "notFound", values };

  redirect(`/properties/${propertyId}`);
}

// Deletes a property with its rooms and photos (owners and admins).
export async function deleteProperty(
  propertyId: string,
): Promise<ActionResult> {
  const active = await getActiveMembership();
  if (!propertyIdSchema.safeParse(propertyId).success) {
    return { status: "error", error: "notFound" };
  }

  const supabase = await createClient();
  // The photo rows go with the cascade; their files are removed afterwards.
  const photos = await supabase
    .from("photos")
    .select("storage_path")
    .eq("property_id", propertyId)
    .eq("org_id", active.orgId);
  if (photos.error) return { status: "error", error: "unexpected" };

  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("org_id", active.orgId)
    .select("id");
  if (error || data.length === 0) {
    return {
      status: "error",
      error: error ? errorKeyFrom(error) : "insufficientRole",
    };
  }

  await removePhotoFiles(
    supabase,
    photos.data.map((photo) => photo.storage_path),
  );
  redirect("/properties");
}
