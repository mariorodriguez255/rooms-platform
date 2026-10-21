import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Reads of applications for the operator, with the signed-in user's client
// (RLS applies) and always filtered by the active organization.

type Client = SupabaseClient<Database>;

// Applications to a room, newest first.
export async function listRoomApplications(
  supabase: Client,
  orgId: string,
  roomId: string,
) {
  const { data, error } = await supabase
    .from("applications")
    .select("id, created_at, answers, candidates (name)")
    .eq("org_id", orgId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// One application with its candidate, room and consents (newest first),
// or null if it is not in the organization.
export async function findApplication(
  supabase: Client,
  orgId: string,
  applicationId: string,
) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, room_id, created_at, updated_at, answers, candidates (name, email, phone), rooms (name, properties (name)), consents (text_version, accepted_at)",
    )
    .eq("org_id", orgId)
    .eq("id", applicationId)
    .order("accepted_at", { referencedTable: "consents", ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The organization's contact email: applications are only accepted with it.
export async function getContactEmail(
  supabase: Client,
  orgId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("contact_email")
    .eq("id", orgId)
    .single();
  if (error) throw error;
  return data.contact_email;
}
