import type { Json } from "@/types/database";

// Allow-list of room features. The database only checks that `features` is
// an object of booleans; which keys exist is decided here. Adding one means
// adding it to this list and to the "roomFeatures" messages.
export const ROOM_FEATURES = [
  "private_bathroom",
  "balcony",
  "exterior",
  "furnished",
  "double_bed",
  "desk",
  "air_conditioning",
  "heating",
  "bills_included",
] as const;

export type RoomFeature = (typeof ROOM_FEATURES)[number];

export function isRoomFeature(value: unknown): value is RoomFeature {
  return ROOM_FEATURES.some((feature) => feature === value);
}

// Features as stored: only the ones that apply, set to true.
export function featuresToJson(
  features: readonly RoomFeature[],
): Record<string, boolean> {
  return Object.fromEntries(features.map((feature) => [feature, true]));
}

// The known features set to true, in the order of the list. Unknown keys
// (written outside the app) are ignored.
export function featuresFromJson(json: Json): RoomFeature[] {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return [];
  }
  return ROOM_FEATURES.filter((feature) => json[feature] === true);
}
