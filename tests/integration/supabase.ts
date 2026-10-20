import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Helpers for integration tests against the local Supabase. The secret key
// is only used here, to create and delete fixture users; everything under
// test runs with the publishable key and a user session, like the app.

type Client = SupabaseClient<Database>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is missing: copy the local values of \`pnpm db:status\` to .env.local`,
    );
  }
  return value;
}

const url = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const options = { auth: { persistSession: false, autoRefreshToken: false } };

export function anonClient(): Client {
  return createClient<Database>(
    url(),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    options,
  );
}

export function adminClient(): Client {
  return createClient<Database>(
    url(),
    requireEnv("SUPABASE_SECRET_KEY"),
    options,
  );
}

export type TestUser = { id: string; email: string; client: Client };

const PASSWORD = "integration-test-password"; // secret-scan:allow gitleaks:allow (fictitious, local only)

// A confirmed user with a unique email, signed in with its own client.
export async function createTestUser(name: string): Promise<TestUser> {
  const email = `${name}-${crypto.randomUUID()}@example.org`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

// Deletes users (memberships and profiles cascade) and organizations.
export async function cleanUp(
  users: TestUser[],
  orgIds: string[],
): Promise<void> {
  const admin = adminClient();
  if (orgIds.length > 0) {
    await admin.from("organizations").delete().in("id", orgIds);
  }
  await Promise.all(users.map((user) => admin.auth.admin.deleteUser(user.id)));
}
