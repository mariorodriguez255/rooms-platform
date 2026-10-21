// Calendar dates (no time) as ISO strings, "2026-11-30", which is how
// Postgres returns `date` columns and how <input type="date"> sends them.

// Operators work in Spain. (The Canary Islands are an hour behind; for
// "which day is it" that only matters for one hour around midnight.)
export const APP_TIME_ZONE = "Europe/Madrid";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Today's date in Spain. `now` is a parameter so tests can fix the clock.
export function todayInSpain(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// A real calendar date between 2000 and 2100 (rejects "2026-02-30").
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as [
    number,
    number,
    number,
    number,
  ];
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Midnight UTC of the date: format it with `timeZone: "UTC"` so that the
// day never shifts.
export function isoDateToUtc(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

// Whole days from `from` to `to` (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number {
  const ms = isoDateToUtc(to).getTime() - isoDateToUtc(from).getTime();
  return Math.round(ms / 86_400_000);
}
