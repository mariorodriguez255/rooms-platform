import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  cleanUp,
  createTestUser,
  type TestUser,
} from "./supabase";

// Milestone 3, through the real API: only the server's secret key can call
// the public form's functions, and applications stay inside their
// organization. Same scenario as supabase/tests/030_public_form.test.sql.

const ANSWERS = {
  move_in_date: "2026-12-01",
  stay_months: 6,
  occupation: "worker",
  schedule: "morning",
  remote_work: "no",
  cleanliness: 4,
  noise: 2,
  visits: 2,
  common_areas: 3,
  smoking: "no",
  pets: false,
  adult_declared: true,
};

let alice: TestUser;
let bob: TestUser;
let orgA: string;
let orgB: string;
let roomA: string;
let tokenA: string;
const candidateEmail = `candidate-${crypto.randomUUID()}@example.org`;

beforeAll(async () => {
  [alice, bob] = await Promise.all([
    createTestUser("alice-apply"),
    createTestUser("bob-apply"),
  ]);
  const [a, b] = await Promise.all([
    alice.client.rpc("create_organization", { org_name: "Apply Org A" }),
    bob.client.rpc("create_organization", { org_name: "Apply Org B" }),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  orgA = a.data;
  orgB = b.data;

  const contact = await alice.client
    .from("organizations")
    .update({ contact_email: "privacidad@example.org" })
    .eq("id", orgA);
  if (contact.error) throw contact.error;

  const property = await alice.client
    .from("properties")
    .insert({
      org_id: orgA,
      name: "Piso A",
      address: "Calle Ficticia 1",
      city: "Madrid",
      region: "ES-MD",
    })
    .select("id")
    .single();
  if (property.error) throw property.error;
  const room = await alice.client
    .from("rooms")
    .insert({
      org_id: orgA,
      property_id: property.data.id,
      name: "Hab A",
      price_cents: 45000,
    })
    .select("id, public_token")
    .single();
  if (room.error) throw room.error;
  roomA = room.data.id;
  tokenA = room.data.public_token;
});

afterAll(async () => {
  // Deleting the organizations cascades to candidates, applications and
  // consents (and lets the rooms go).
  await cleanUp([alice, bob].filter(Boolean), [orgA, orgB].filter(Boolean));
});

function submit(client: ReturnType<typeof adminClient>, email: string) {
  return client.rpc("submit_application", {
    room_token: tokenA,
    candidate_email: email,
    candidate_name: "Candidata Integración",
    answers: ANSWERS,
    consent_version: "2026-10-21",
  });
}

describe("the public form's functions", () => {
  it("cannot be called without the secret key", async () => {
    const anon = anonClient();
    const anonRead = await anon.rpc("get_public_room", { room_token: tokenA });
    const anonSubmit = await submit(anon, candidateEmail);
    const userSubmit = await submit(bob.client, candidateEmail);
    expect(anonRead.error?.code).toBe("42501");
    expect(anonSubmit.error?.code).toBe("42501");
    expect(userSubmit.error?.code).toBe("42501");
  });

  it("work for the server: the room's public data, then an application", async () => {
    const admin = adminClient();
    const { data: rooms, error } = await admin.rpc("get_public_room", {
      room_token: tokenA,
    });
    expect(error).toBeNull();
    expect(rooms?.[0]).toMatchObject({
      room_name: "Hab A",
      city: "Madrid",
      org_name: "Apply Org A",
      accepting: true,
    });
    expect(rooms?.[0]).not.toHaveProperty("address");

    const submitted = await submit(admin, candidateEmail);
    expect(submitted.error).toBeNull();
    expect(submitted.data?.[0]?.is_new).toBe(true);
  });
});

describe("applications between organizations", () => {
  it("members of the organization read them", async () => {
    const { data } = await alice.client
      .from("applications")
      .select("room_id, candidates (email), consents (text_version)")
      .eq("org_id", orgA);
    expect(data).toEqual([
      {
        room_id: roomA,
        candidates: { email: candidateEmail },
        consents: [{ text_version: "2026-10-21" }],
      },
    ]);
  });

  it("another organization sees none of it", async () => {
    const [applications, candidates, consents] = await Promise.all([
      bob.client.from("applications").select("id").eq("org_id", orgA),
      bob.client.from("candidates").select("id").eq("org_id", orgA),
      bob.client.from("consents").select("id").eq("org_id", orgA),
    ]);
    expect(applications.data).toEqual([]);
    expect(candidates.data).toEqual([]);
    expect(consents.data).toEqual([]);
  });

  it("nobody writes applications through the API", async () => {
    const insert = await alice.client.from("applications").insert({
      org_id: orgA,
      room_id: roomA,
      candidate_id: crypto.randomUUID(),
      answers: {},
    });
    expect(insert.error?.code).toBe("42501");
  });
});

describe("replacing a room's link", () => {
  it("only members can, and the old link stops working", async () => {
    const intruder = await bob.client.rpc("rotate_room_token", {
      target_room: roomA,
    });
    expect(intruder.error?.message).toBe("not_found");

    const rotated = await alice.client.rpc("rotate_room_token", {
      target_room: roomA,
    });
    expect(rotated.data).toMatch(/^[0-9a-f]{32}$/);

    const admin = adminClient();
    const old = await admin.rpc("get_public_room", { room_token: tokenA });
    expect(old.data).toEqual([]);
    const current = await admin.rpc("get_public_room", {
      room_token: rotated.data!,
    });
    expect(current.data).toHaveLength(1);
  });
});
