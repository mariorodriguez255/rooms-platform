import { describe, expect, it } from "vitest";

import {
  countByGroup,
  FREEING_SOON_DAYS,
  getBoardGroup,
  getBoardState,
  isBoardGroup,
  type BoardRoom,
} from "@/lib/rooms/board-state";
import {
  featuresFromJson,
  featuresToJson,
  isRoomFeature,
  ROOM_FEATURES,
} from "@/lib/rooms/features";
import { isSpanishRegion, SPANISH_REGIONS } from "@/lib/regions";
import messages from "@/messages/es.json";

const TODAY = "2026-10-21";

function room(
  status: BoardRoom["status"],
  available_from: string | null = null,
): BoardRoom {
  return { status, available_from };
}

describe("getBoardState", () => {
  it.each([
    // Vacant
    [room("vacant"), { kind: "free" }, "free"],
    [room("vacant", "2026-10-01"), { kind: "free" }, "free"],
    [room("vacant", TODAY), { kind: "free" }, "free"],
    [
      room("vacant", "2026-12-01"),
      { kind: "freeFrom", date: "2026-12-01" },
      "free",
    ],
    // Occupied
    [room("occupied"), { kind: "occupied" }, "occupied"],
    [
      room("occupied", TODAY),
      { kind: "freesUp", date: TODAY, soon: true },
      "soon",
    ],
    [
      room("occupied", "2026-11-20"), // 30 days: still soon
      { kind: "freesUp", date: "2026-11-20", soon: true },
      "soon",
    ],
    [
      room("occupied", "2026-11-21"), // 31 days
      { kind: "freesUp", date: "2026-11-21", soon: false },
      "occupied",
    ],
    [
      room("occupied", "2026-10-20"),
      { kind: "overdue", date: "2026-10-20" },
      "soon",
    ],
    // Unavailable, whatever the date
    [room("unavailable"), { kind: "unavailable" }, "unavailable"],
    [room("unavailable", "2026-12-01"), { kind: "unavailable" }, "unavailable"],
  ])("%o → %o (%s)", (input, state, group) => {
    const result = getBoardState(input, TODAY);
    expect(result).toEqual(state);
    expect(getBoardGroup(result)).toBe(group);
  });

  it("highlights rooms that free up within 30 days", () => {
    expect(FREEING_SOON_DAYS).toBe(30);
  });
});

describe("countByGroup", () => {
  it("counts every room in exactly one group", () => {
    const states = [
      room("vacant"),
      room("vacant", "2026-12-01"),
      room("occupied", "2026-10-30"),
      room("occupied", "2026-10-01"),
      room("occupied"),
      room("unavailable"),
    ].map((r) => getBoardState(r, TODAY));
    expect(countByGroup(states)).toEqual({
      free: 2,
      soon: 2,
      occupied: 1,
      unavailable: 1,
    });
    expect(countByGroup([])).toEqual({
      free: 0,
      soon: 0,
      occupied: 0,
      unavailable: 0,
    });
  });

  it("recognizes the filters of the URL", () => {
    expect(isBoardGroup("soon")).toBe(true);
    expect(isBoardGroup("all")).toBe(false);
    expect(isBoardGroup("constructor")).toBe(false);
    expect(isBoardGroup(undefined)).toBe(false);
  });
});

describe("room features", () => {
  it("stores only the features that apply", () => {
    expect(featuresToJson(["balcony", "desk"])).toEqual({
      balcony: true,
      desk: true,
    });
    expect(featuresToJson([])).toEqual({});
  });

  it("reads known features set to true, in the order of the list", () => {
    expect(
      featuresFromJson({
        desk: true,
        balcony: true,
        heating: false,
        swimming_pool: true,
      }),
    ).toEqual(["balcony", "desk"]);
    expect(featuresFromJson([])).toEqual([]);
    expect(featuresFromJson(null)).toEqual([]);
    expect(featuresFromJson("balcony")).toEqual([]);
  });

  it("is an allow-list", () => {
    expect(isRoomFeature("balcony")).toBe(true);
    expect(isRoomFeature("toString")).toBe(false);
    expect(isRoomFeature("nationality")).toBe(false);
  });

  it("has a Spanish label for every feature", () => {
    expect(Object.keys(messages.roomFeatures).sort()).toEqual(
      [...ROOM_FEATURES].sort(),
    );
  });
});

describe("regions", () => {
  it("lists the 17 autonomous communities and the 2 autonomous cities", () => {
    expect(SPANISH_REGIONS).toHaveLength(19);
    expect(new Set(SPANISH_REGIONS).size).toBe(19);
  });

  it("are sorted by their Spanish name", () => {
    const names = SPANISH_REGIONS.map((code) => messages.regions[code]);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
  });

  it("has a Spanish name for every region", () => {
    expect(Object.keys(messages.regions).sort()).toEqual(
      [...SPANISH_REGIONS].sort(),
    );
  });

  it("recognizes only known codes", () => {
    expect(isSpanishRegion("ES-NC")).toBe(true);
    expect(isSpanishRegion("ES-XX")).toBe(false);
    expect(isSpanishRegion("hasOwnProperty")).toBe(false);
  });
});
