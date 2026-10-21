import "server-only";

import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { getSecretKey } from "@/lib/server-env";
import type { Database } from "@/types/database";

// Supabase client with the SECRET key: it bypasses RLS. Only for what has
// no signed-in user behind it, i.e. the public application form (ADR 0010),
// and there only to call the functions granted to service_role and to sign
// photo URLs. ESLint forbids importing it anywhere else (eslint.config.mjs).
export async function createAdminClient() {
  // Never at prerender time: signed URLs and submissions depend on "now".
  await connection();
  return createClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getSecretKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
