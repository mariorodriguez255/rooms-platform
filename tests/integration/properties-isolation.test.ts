import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  cleanUp,
  createTestUser,
  type TestUser,
} from "./supabase";

// Milestone 2: properties, rooms and photos (rows and files) of one
// organization are invisible and untouchable for another, through the real
// API (PostgREST and Storage). Same scenario as supabase/tests/02x.

const BUCKET = "photos";
// Enough for Storage, which checks the declared type and the size; the JPEG
// signature is checked by the app's Server Action.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);

let alice: TestUser;
let bob: TestUser;
let orgA: string;
let orgB: string;
let propertyA: string;
let propertyB: string;
let roomA: string;
let pathA: string;

beforeAll(async () => {
  [alice, bob] = await Promise.all([
    createTestUser("alice-rooms"),
    createTestUser("bob-rooms"),
  ]);
  const [a, b] = await Promise.all([
    alice.client.rpc("create_organization", { org_name: "Rooms Org A" }),
    bob.client.rpc("create_organization", { org_name: "Rooms Org B" }),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  orgA = a.data;
  orgB = b.data;

  const newProperty = (user: TestUser, orgId: string, name: string) =>
    user.client
      .from("properties")
      .insert({
        org_id: orgId,
        name,
        address: "Calle Ficticia 1",
        city: "Madrid",
        region: "ES-MD",
      })
      .select("id")
      .single();
  const [pa, pb] = await Promise.all([
    newProperty(alice, orgA, "Piso A"),
    newProperty(bob, orgB, "Piso B"),
  ]);
  if (pa.error) throw pa.error;
  if (pb.error) throw pb.error;
  propertyA = pa.data.id;
  propertyB = pb.data.id;

  const room = await alice.client
    .from("rooms")
    .insert({
      org_id: orgA,
      property_id: propertyA,
      name: "Hab A",
      price_cents: 45000,
    })
    .select("id")
    .single();
  if (room.error) throw room.error;
  roomA = room.data.id;

  pathA = `${orgA}/${propertyA}/${crypto.randomUUID()}.jpg`;
  const upload = await alice.client.storage
    .from(BUCKET)
    .upload(pathA, JPEG, { contentType: "image/jpeg" });
  if (upload.error) throw upload.error;
  const photo = await alice.client.from("photos").insert({
    org_id: orgA,
    property_id: propertyA,
    room_id: roomA,
    storage_path: pathA,
    width: 8,
    height: 8,
  });
  if (photo.error) throw photo.error;
});

afterAll(async () => {
  // Files go through the Storage API (never SQL); rows cascade with the
  // organizations.
  const admin = adminClient();
  for (const org of [orgA, orgB].filter(Boolean)) {
    const { data: folders } = await admin.storage.from(BUCKET).list(org);
    for (const folder of folders ?? []) {
      const { data: files } = await admin.storage
        .from(BUCKET)
        .list(`${org}/${folder.name}`);
      const paths = (files ?? []).map(
        (file) => `${org}/${folder.name}/${file.name}`,
      );
      if (paths.length > 0) await admin.storage.from(BUCKET).remove(paths);
    }
  }
  await cleanUp([alice, bob].filter(Boolean), [orgA, orgB].filter(Boolean));
});

describe("properties, rooms and photos between organizations", () => {
  it("each organization sees only its own rows", async () => {
    const [properties, rooms, photos] = await Promise.all([
      bob.client.from("properties").select("id"),
      bob.client.from("rooms").select("id"),
      bob.client.from("photos").select("id"),
    ]);
    expect(properties.data).toEqual([{ id: propertyB }]);
    expect(rooms.data).toEqual([]);
    expect(photos.data).toEqual([]);

    const own = await alice.client.from("rooms").select("id");
    expect(own.data).toEqual([{ id: roomA }]);
  });

  it("writes on another organization change nothing", async () => {
    const edit = await bob.client
      .from("rooms")
      .update({ price_cents: 1 })
      .eq("id", roomA)
      .select("id");
    expect(edit.data).toEqual([]);

    const removal = await bob.client
      .from("properties")
      .delete()
      .eq("id", propertyA)
      .select("id");
    expect(removal.data).toEqual([]);

    const photoRemoval = await bob.client
      .from("photos")
      .delete()
      .eq("storage_path", pathA)
      .select("id");
    expect(photoRemoval.data).toEqual([]);

    const { data: room } = await alice.client
      .from("rooms")
      .select("price_cents")
      .eq("id", roomA)
      .single();
    expect(room?.price_cents).toBe(45000);
  });

  it("nobody creates rows in another organization", async () => {
    const property = await bob.client.from("properties").insert({
      org_id: orgA,
      name: "Intruso",
      address: "Calle 2",
      city: "Madrid",
      region: "ES-MD",
    });
    expect(property.error?.code).toBe("42501");

    // His own organization, but A's property: the composite foreign key.
    const room = await bob.client.from("rooms").insert({
      org_id: orgB,
      property_id: propertyA,
      name: "Colada",
      price_cents: 40000,
    });
    expect(room.error?.code).toBe("23503");
  });

  it("gives visitors without a session nothing", async () => {
    const anon = anonClient();
    const read = await anon.from("properties").select("id");
    expect(read.error?.code).toBe("42501");
    const download = await anon.storage.from(BUCKET).download(pathA);
    expect(download.error).not.toBeNull();
  });
});

describe("photo files in Storage", () => {
  it("members download and sign their organization's photos", async () => {
    const download = await alice.client.storage.from(BUCKET).download(pathA);
    expect(download.error).toBeNull();
    expect(download.data?.size).toBe(JPEG.length);

    const signed = await alice.client.storage
      .from(BUCKET)
      .createSignedUrl(pathA, 60);
    expect(signed.error).toBeNull();
    const response = await fetch(signed.data!.signedUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
  });

  it("another organization cannot download, sign, list, upload or delete them", async () => {
    const storage = bob.client.storage.from(BUCKET);

    expect((await storage.download(pathA)).error).not.toBeNull();
    expect((await storage.createSignedUrl(pathA, 60)).error).not.toBeNull();
    expect((await storage.list(`${orgA}/${propertyA}`)).data).toEqual([]);

    const upload = await storage.upload(
      `${orgA}/${propertyA}/${crypto.randomUUID()}.jpg`,
      JPEG,
      { contentType: "image/jpeg" },
    );
    expect(upload.error).not.toBeNull();

    // Storage answers a denied delete with an empty list.
    const removal = await storage.remove([pathA]);
    expect(removal.data).toEqual([]);
    const stillThere = await alice.client.storage.from(BUCKET).download(pathA);
    expect(stillThere.error).toBeNull();
  });

  it("the bucket only takes JPEG up to 3 MiB", async () => {
    const storage = alice.client.storage.from(BUCKET);
    const png = await storage.upload(
      `${orgA}/${propertyA}/${crypto.randomUUID()}.jpg`,
      JPEG,
      { contentType: "image/png" },
    );
    expect(png.error).not.toBeNull();

    const big = await storage.upload(
      `${orgA}/${propertyA}/${crypto.randomUUID()}.jpg`,
      new Uint8Array(3 * 1024 * 1024 + 1),
      { contentType: "image/jpeg" },
    );
    expect(big.error).not.toBeNull();
  });

  it("files are never overwritten", async () => {
    const overwrite = await alice.client.storage
      .from(BUCKET)
      .upload(pathA, JPEG, { contentType: "image/jpeg", upsert: true });
    expect(overwrite.error).not.toBeNull();
  });
});
