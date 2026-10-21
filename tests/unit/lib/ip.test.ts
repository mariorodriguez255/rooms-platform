import { describe, expect, it, vi } from "vitest";

import { clientIp, hashIp } from "@/lib/applications/ip";

// server-env imports "server-only", which refuses to load outside the
// server bundle; in unit tests it is an empty module.
vi.mock("server-only", () => ({}));

const { parseEmailEnv } = await import("@/lib/server-env");

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("clientIp", () => {
  it("takes the leftmost X-Forwarded-For entry (the client, on Vercel)", () => {
    expect(
      clientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
    expect(clientIp(headers({ "x-forwarded-for": "2001:db8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("is null when unknown", () => {
    expect(clientIp(headers({}))).toBeNull();
    expect(clientIp(headers({ "x-forwarded-for": " " }))).toBeNull();
  });
});

describe("hashIp", () => {
  const secret = "s".repeat(32); // secret-scan:allow (test value)

  it("is a keyed SHA-256: 64 hex characters, stable, never the IP", () => {
    const hash = hashIp("203.0.113.7", secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("203.0.113.7", secret)).toBe(hash);
    expect(hash).not.toContain("203");
  });

  it("depends on the secret, so it cannot be reversed by brute force without it", () => {
    expect(hashIp("203.0.113.7", "t".repeat(32))).not.toBe(
      hashIp("203.0.113.7", secret),
    );
    expect(hashIp("203.0.113.8", secret)).not.toBe(
      hashIp("203.0.113.7", secret),
    );
  });
});

describe("parseEmailEnv", () => {
  it("requires the variables of the chosen provider", () => {
    expect(
      parseEmailEnv({
        EMAIL_PROVIDER: "mailpit",
        EMAIL_FROM: "a <a@example.com>",
        MAILPIT_URL: "http://127.0.0.1:54324",
      }),
    ).toEqual({
      EMAIL_PROVIDER: "mailpit",
      EMAIL_FROM: "a <a@example.com>",
      MAILPIT_URL: "http://127.0.0.1:54324",
    });
    expect(parseEmailEnv({ EMAIL_PROVIDER: "disabled" })).toEqual({
      EMAIL_PROVIDER: "disabled",
    });
    expect(() =>
      parseEmailEnv({ EMAIL_PROVIDER: "resend", EMAIL_FROM: "a@example.com" }),
    ).toThrow(/RESEND_API_KEY/);
    expect(() => parseEmailEnv({})).toThrow(/EMAIL_PROVIDER/);
  });

  it("never puts values in its errors", () => {
    expect(() =>
      parseEmailEnv({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_secret" }),
    ).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("re_secret"),
      }),
    );
  });
});
