// Decimal numbers as operators type them in Spain: a comma for decimals
// and, optionally, dots between thousands ("1.200,50"). A dot alone is also
// read as the decimal separator ("450.5"), unless it groups thousands
// ("1.200"). Values are returned scaled to integers (cents, tenths…) so
// that no floating point arithmetic is involved.

const THOUSANDS = /^\d{1,3}(\.\d{3})+$/;

// Returns the value multiplied by 10^decimals, or null when the text is not
// a non-negative number with at most `decimals` decimal places.
export function parseDecimal(input: string, decimals: number): number | null {
  let text = input.replace(/[\s€]/g, "");
  if (text.includes(",")) {
    const [integerPart = "", ...rest] = text.split(",");
    if (rest.length > 1) return null;
    if (integerPart.includes(".") && !THOUSANDS.test(integerPart)) return null;
    text = `${integerPart.replaceAll(".", "")}.${rest[0]}`;
  } else if (THOUSANDS.test(text)) {
    text = text.replaceAll(".", "");
  }

  const match = /^(\d+)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  const [, integerDigits = "", fractionDigits = ""] = match;
  if (fractionDigits.length > decimals) return null;
  if (integerDigits.length > 12) return null;

  const scale = 10 ** decimals;
  return (
    Number(integerDigits) * scale +
    Number(fractionDigits.padEnd(decimals, "0") || "0")
  );
}

// The inverse, to prefill a form: 45050 with 2 decimals → "450,50"; whole
// values lose their decimals (45000 → "450").
export function formatDecimalInput(scaled: number, decimals: number): string {
  const scale = 10 ** decimals;
  const integerPart = Math.floor(scaled / scale);
  const fraction = scaled % scale;
  if (fraction === 0) return String(integerPart);
  return `${integerPart},${String(fraction).padStart(decimals, "0")}`;
}
