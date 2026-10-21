import { describe, expect, it } from "vitest";

import { authConfirmUrl, routeAccess, safeNextPath } from "@/lib/auth/routes";

describe("routeAccess", () => {
  it.each(["/", "/login", "/signup", "/forgot-password"])(
    "%s is for visitors only",
    (path) => {
      expect(routeAccess(path)).toBe("guest-only");
    },
  );

  it("leaves email links open to everyone", () => {
    expect(routeAccess("/auth/confirm")).toBe("open");
  });

  it("leaves the public application form open to candidates", () => {
    expect(routeAccess("/apply/a1000000000000000000000000000001")).toBe("open"); // secret-scan:allow (seed token)
    expect(routeAccess("/applications/123")).toBe("protected");
  });

  it.each([
    "/dashboard",
    "/onboarding",
    "/settings/members",
    "/reset-password",
    "/invite/abc",
    "/login-but-not-really",
  ])("%s needs a session", (path) => {
    expect(routeAccess(path)).toBe("protected");
  });
});

describe("safeNextPath", () => {
  it("accepts same-site paths with query strings", () => {
    expect(safeNextPath("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });

  it.each([
    ["an absolute URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a relative path", "dashboard"],
    ["a path with a new line", "/dash\nboard"],
    ["a path with a tab", "/\t/evil.example"],
    ["an empty string", ""],
    ["a non-string", 42],
    ["a very long value", `/${"a".repeat(3000)}`],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath(null, "/login")).toBe("/login");
  });
});

describe("authConfirmUrl", () => {
  it("builds the confirm URL with an encoded next path", () => {
    expect(authConfirmUrl("https://app.example", "/invite/abc?x=1")).toBe(
      "https://app.example/auth/confirm?next=%2Finvite%2Fabc%3Fx%3D1",
    );
  });

  it("never carries an unsafe next path", () => {
    expect(
      authConfirmUrl("http://localhost:3000", "https://evil.example"),
    ).toBe("http://localhost:3000/auth/confirm?next=%2Fdashboard");
  });
});
