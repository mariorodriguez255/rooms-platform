import { describe, expect, it } from "vitest";

import { daysBetween, isIsoDate, todayInSpain } from "@/lib/dates";

describe("todayInSpain", () => {
  it("uses the date in Spain, not in UTC", () => {
    // 23:30 UTC on 31 October 2026 is already 1 November in Madrid
    // (winter time, UTC+1).
    expect(todayInSpain(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
    // 22:30 UTC on 20 July is 00:30 of 21 July in Madrid (UTC+2).
    expect(todayInSpain(new Date("2026-07-20T22:30:00Z"))).toBe("2026-07-21");
    expect(todayInSpain(new Date("2026-07-20T21:30:00Z"))).toBe("2026-07-20");
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("2026-11-30")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it.each([
    "2026-02-29",
    "2026-13-01",
    "2026-11-31",
    "30/11/2026",
    "",
    "1999-12-31",
    "2101-01-01",
  ])("rejects %j", (value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts whole days, also across a daylight saving change", () => {
    expect(daysBetween("2026-10-21", "2026-10-21")).toBe(0);
    expect(daysBetween("2026-10-21", "2026-11-20")).toBe(30);
    // Spain moves the clock back on 25 October 2026.
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(daysBetween("2026-10-21", "2026-10-18")).toBe(-3);
  });
});
