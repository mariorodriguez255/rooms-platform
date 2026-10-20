import { describe, expect, it } from "vitest";

import { errorKeyFrom } from "@/lib/errors";

describe("errorKeyFrom", () => {
  it("maps Supabase Auth codes", () => {
    expect(
      errorKeyFrom({ code: "invalid_credentials", message: "Invalid login" }),
    ).toBe("invalidCredentials");
    expect(errorKeyFrom({ code: "over_email_send_rate_limit" })).toBe(
      "rateLimited",
    );
  });

  it("maps the codes raised by our SQL functions (in the message)", () => {
    expect(errorKeyFrom({ code: "P0001", message: "last_owner" })).toBe(
      "lastOwner",
    );
    expect(errorKeyFrom({ code: "42501", message: "insufficient_role" })).toBe(
      "insufficientRole",
    );
  });

  it("never exposes unknown or internal messages", () => {
    expect(
      errorKeyFrom({ code: "23505", message: "duplicate key value violates…" }),
    ).toBe("unexpected");
    expect(errorKeyFrom({ message: "constructor" })).toBe("unexpected");
    expect(errorKeyFrom(null)).toBe("unexpected");
  });
});
