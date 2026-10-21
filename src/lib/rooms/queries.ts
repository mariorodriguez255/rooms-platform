import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Reads of properties and rooms shared by several pages. They always filter
// by the active organization: RLS lets a user read every organization they
// belong to, but the app shows one at a time.

type Client = SupabaseClient<Database>;

const ROOM_SUMMARY = "id, name, price_cents, status, available_from";

// Every property of the organization with its rooms, sorted by name.
export async function listPropertiesWithRooms(supabase: Client, orgId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, name, city, total_rent_reference_cents, rooms (${ROOM_SUMMARY})`,
    )
    .eq("org_id", orgId)
    .order("name")
    .order("name", { referencedTable: "rooms" });
  if (error) throw error;
  return data;
}

export type PropertyWithRooms = Awaited<
  ReturnType<typeof listPropertiesWithRooms>
>[number];

export type RoomSummary = PropertyWithRooms["rooms"][number];

// One property and its rooms, or null if it is not in the organization.
export async function findProperty(
  supabase: Client,
  orgId: string,
  propertyId: string,
) {
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, name, address, city, region, total_rent_reference_cents, rooms (${ROOM_SUMMARY})`,
    )
    .eq("org_id", orgId)
    .eq("id", propertyId)
    .order("name", { referencedTable: "rooms" })
    .maybeSingle();
  if (error) throw error;
  return data;
}

// One room with the name of its property, or null if it is not in the
// organization.
export async function findRoom(
  supabase: Client,
  orgId: string,
  roomId: string,
) {
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, property_id, name, price_cents, deposit_cents, size_m2, features, status, available_from, public_token, properties (name)",
    )
    .eq("org_id", orgId)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
