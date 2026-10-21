import { describe, expect, it } from "vitest";

import { centsToInput, MAX_AMOUNT_CENTS, parseEuros } from "@/lib/money";
import { formatDecimalInput, parseDecimal } from "@/lib/numbers";

describe("parseEuros", () => {
  it.each([
    ["450", 45000],
    ["450,5", 45050],
    ["450,50", 45050],
    ["450.5", 45050],
    ["1.200", 120000],
    ["1.200,50", 120050],
    ["12.345.678", null], // above the maximum
    [" 450 € ", 45000],
    ["0", 0],
    ["0,99", 99],
    ["450,", 45000],
  ])("reads %j as %j cents", (input, expected) => {
    expect(parseEuros(input)).toBe(expected);
  });

  it.each(["", "abc", "-450", "450,505", "4,50,5", "1.20.0", ",5", "1e3"])(
    "rejects %j",
    (input) => {
      expect(parseEuros(input)).toBeNull();
    },
  );

  it("accepts up to the database limit of 99.999,99 €", () => {
    expect(parseEuros("99.999,99")).toBe(MAX_AMOUNT_CENTS);
    expect(parseEuros("100.000")).toBeNull();
  });

  it("never goes through floating point", () => {
    // 0.1 + 0.2 !== 0.3 in JavaScript; cents keep sums exact.
    expect((parseEuros("0,1") ?? 0) + (parseEuros("0,2") ?? 0)).toBe(
      parseEuros("0,3"),
    );
    expect(parseEuros("1234,56")).toBe(123456);
  });
});

describe("centsToInput", () => {
  it("prefills forms in the Spanish format, without needless decimals", () => {
    expect(centsToInput(45000)).toBe("450");
    expect(centsToInput(45050)).toBe("450,50");
    expect(centsToInput(45005)).toBe("450,05");
    expect(centsToInput(null)).toBe("");
  });

  it("round-trips with parseEuros", () => {
    for (const cents of [1, 99, 100, 45050, MAX_AMOUNT_CENTS]) {
      expect(parseEuros(centsToInput(cents))).toBe(cents);
    }
  });
});

describe("parseDecimal with one decimal (square metres)", () => {
  it("scales to tenths", () => {
    expect(parseDecimal("12", 1)).toBe(120);
    expect(parseDecimal("12,5", 1)).toBe(125);
    expect(parseDecimal("12.5", 1)).toBe(125);
    expect(parseDecimal("12,55", 1)).toBeNull();
    expect(formatDecimalInput(125, 1)).toBe("12,5");
  });
});
