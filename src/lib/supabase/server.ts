import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

// Supabase client for Server Components, Server Actions and Route Handlers.
// It acts as the signed-in user (publishable key + session cookie), so every
// query goes through RLS. Create one per request; never share it.
export async function createClient() {
  // Wait for a real request: the client checks the token expiry against the
  // current time, which Cache Components does not allow while prerendering
  // (prefetches included). Session data is never prerendered or cached.
  await connection();
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. Safe to ignore: the
            // proxy refreshes the session before the page renders.
          }
        },
      },
    },
  );
}
