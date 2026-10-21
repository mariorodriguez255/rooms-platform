import { daysBetween } from "@/lib/dates";
import type { Database } from "@/types/database";

// What the room board shows for each room. The database stores what the
// operator decides (status + available_from); the state on the board is
// derived from both and from today's date, so nothing has to change at
// midnight. See ADR 0008.

export type RoomStatus = Database["public"]["Enums"]["room_status"];

export const ROOM_STATUSES = [
  "vacant",
  "occupied",
  "unavailable",
] as const satisfies readonly RoomStatus[];

// An occupied room that frees up within this many days is highlighted.
export const FREEING_SOON_DAYS = 30;

export type BoardState =
  // Vacant and available now.
  | { kind: "free" }
  // Vacant, but it can only be let from a later date.
  | { kind: "freeFrom"; date: string }
  // Occupied; the tenant leaves on `date` (today or later).
  | { kind: "freesUp"; date: string; soon: boolean }
  // Occupied, but the date it should have freed up is past: the operator
  // has to update it.
  | { kind: "overdue"; date: string }
  // Occupied, with no known end.
  | { kind: "occupied" }
  | { kind: "unavailable" };

export type BoardRoom = {
  status: RoomStatus;
  available_from: string | null;
};

// `today` is an ISO date in Spain (see todayInSpain()).
export function getBoardState(room: BoardRoom, today: string): BoardState {
  const date = room.available_from;
  switch (room.status) {
    case "unavailable":
      return { kind: "unavailable" };
    case "vacant":
      return date && date > today
        ? { kind: "freeFrom", date }
        : { kind: "free" };
    case "occupied": {
      if (!date) return { kind: "occupied" };
      if (date < today) return { kind: "overdue", date };
      const soon = daysBetween(today, date) <= FREEING_SOON_DAYS;
      return { kind: "freesUp", date, soon };
    }
  }
}

// The four groups of the board's counters and filters.
export const BOARD_GROUPS = [
  "free",
  "soon",
  "occupied",
  "unavailable",
] as const;

export type BoardGroup = (typeof BOARD_GROUPS)[number];

export function getBoardGroup(state: BoardState): BoardGroup {
  switch (state.kind) {
    case "free":
    case "freeFrom":
      return "free";
    case "overdue":
      return "soon";
    case "freesUp":
      return state.soon ? "soon" : "occupied";
    case "occupied":
      return "occupied";
    case "unavailable":
      return "unavailable";
  }
}

export function isBoardGroup(value: unknown): value is BoardGroup {
  return BOARD_GROUPS.some((group) => group === value);
}

export function countByGroup(
  states: readonly BoardState[],
): Record<BoardGroup, number> {
  const counts: Record<BoardGroup, number> = {
    free: 0,
    soon: 0,
    occupied: 0,
    unavailable: 0,
  };
  for (const state of states) counts[getBoardGroup(state)] += 1;
  return counts;
}
