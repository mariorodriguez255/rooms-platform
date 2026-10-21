import { formatDecimalInput, parseDecimal } from "@/lib/numbers";

// Amounts are stored in euro cents (integers), like Stripe does: adding up
// rents never suffers floating point errors. See ADR 0008.

// Same upper bound as the check constraints of the database: 99.999,99 €.
export const MAX_AMOUNT_CENTS = 9_999_999;

// "450", "450,50", "1.200" → cents. Null when it is not a valid amount.
export function parseEuros(input: string): number | null {
  const cents = parseDecimal(input, 2);
  if (cents === null || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

// Value for a form field: 45050 → "450,50", 45000 → "450".
export function centsToInput(cents: number | null): string {
  return cents === null ? "" : formatDecimalInput(cents, 2);
}

// For Intl / next-intl currency formatting, which works in euros.
export function centsToEuros(cents: number): number {
  return cents / 100;
}
