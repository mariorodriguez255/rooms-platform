import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { anonClient, cleanUp, createTestUser, type TestUser } from "./supabase";

// Milestone 1 "done when": two test organizations cannot see each other's
// data. Same scenario as the pgTAP tests, but through the real API
// (PostgREST + Auth), which also checks grants and exposed schemas.

let alice: TestUser;
let bob: TestUser;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  [alice, bob] = await Promise.all([
    createTestUser("alice"),
    createTestUser("bob"),
  ]);

  const [a, b] = await Promise.all([
    alice.client.rpc("create_organization", { org_name: "Integration Org A" }),
    bob.client.rpc("create_organization", { org_name: "Integration Org B" }),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  orgA = a.data;
  orgB = b.data;
});

afterAll(async () => {
  await cleanUp([alice, bob].filter(Boolean), [orgA, orgB].filter(Boolean));
});

describe("isolation between organizations", () => {
  it("each user sees only their own organization", async () => {
    const { data: aliceOrgs } = await alice.client
      .from("organizations")
      .select("id");
    const { data: bobOrgs } = await bob.client
      .from("organizations")
      .select("id");
    expect(aliceOrgs).toEqual([{ id: orgA }]);
    expect(bobOrgs).toEqual([{ id: orgB }]);
  });

  it("members, profiles and invitations of another organization are invisible", async () => {
    const members = await bob.client
      .from("members")
      .select("org_id")
      .eq("org_id", orgA);
    const profiles = await bob.client
      .from("profiles")
      .select("user_id")
      .eq("user_id", alice.id);
    const invitations = await bob.client
      .from("invitations")
      .select("id")
      .eq("org_id", orgA);
    expect(members.data).toEqual([]);
    expect(profiles.data).toEqual([]);
    expect(invitations.data).toEqual([]);
  });

  it("writes to another organization change nothing", async () => {
    const rename = await bob.client
      .from("organizations")
      .update({ name: "Hacked" })
      .eq("id", orgA)
      .select("id");
    expect(rename.data).toEqual([]);

    const removal = await bob.client
      .from("members")
      .delete()
      .eq("org_id", orgA)
      .select("id");
    expect(removal.data).toEqual([]);

    const selfInsert = await bob.client
      .from("members")
      .insert({ org_id: orgA, user_id: bob.id, role: "owner" });
    expect(selfInsert.error?.code).toBe("42501");

    const invite = await bob.client.rpc("create_invitation", {
      target_org: orgA,
      invitee_email: bob.email,
      invitee_role: "admin",
    });
    expect(invite.error?.message).toBe("insufficient_role");

    const { data: org } = await alice.client
      .from("organizations")
      .select("name")
      .eq("id", orgA)
      .single();
    expect(org?.name).toBe("Integration Org A");
  });
});

describe("the API surface", () => {
  it("gives visitors without a session nothing", async () => {
    const anon = anonClient();
    const read = await anon.from("organizations").select("id");
    expect(read.error?.code).toBe("42501");

    const create = await anon.rpc("create_organization", { org_name: "Anon" });
    expect(create.error?.code).toBe("42501");
  });

  it("does not expose the private schema", async () => {
    // "private" is deliberately not in the generated types: drop them here.
    const untyped = alice.client as unknown as SupabaseClient;
    const result = await untyped
      .schema("private")
      .rpc("is_member", { target_org: orgA });
    expect(result.error?.code).toBe("PGRST106");
  });
});

describe("joining through an invitation", () => {
  it("lets the invited email join with the invited role, and nobody else", async () => {
    const { data: token, error } = await alice.client.rpc("create_invitation", {
      target_org: orgA,
      invitee_email: bob.email.toUpperCase(),
      invitee_role: "staff",
    });
    expect(error).toBeNull();
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const preview = await bob.client.rpc("get_invitation", {
      invitation_token: token!,
    });
    expect(preview.data).toEqual([
      {
        org_name: "Integration Org A",
        role: "staff",
        status: "pending",
        email_matches: true,
      },
    ]);

    const accepted = await bob.client.rpc("accept_invitation", {
      invitation_token: token!,
    });
    expect(accepted.data).toBe(orgA);

    const { data: bobOrgs } = await bob.client
      .from("organizations")
      .select("id")
      .order("created_at");
    expect(bobOrgs?.map((org) => org.id).sort()).toEqual([orgA, orgB].sort());

    // Staff cannot see invitations nor manage members.
    const invitations = await bob.client
      .from("invitations")
      .select("id")
      .eq("org_id", orgA);
    expect(invitations.data).toEqual([]);
  });
});
