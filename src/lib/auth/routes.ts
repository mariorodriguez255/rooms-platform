// Which routes need a session. Used by the proxy to redirect early; it is a
// convenience, not the security boundary: pages and Server Actions check the
// session themselves and RLS filters every query.

export const HOME_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

// Only for visitors without a session: a signed-in user goes to the app.
const GUEST_ONLY_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
]);

// Reachable with or without a session: email links land on /auth/, and
// candidates apply on /apply/ without an account (milestone 3).
const OPEN_PREFIXES = ["/auth/", "/apply/"];

export type RouteAccess = "guest-only" | "open" | "protected";

export function routeAccess(pathname: string): RouteAccess {
  if (GUEST_ONLY_PATHS.has(pathname)) return "guest-only";
  if (OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return "open";
  return "protected";
}

// Only same-site paths are accepted as a post-login destination. Rejects
// absolute URLs and protocol-relative ones ("//evil.example", "/\evil.example")
// so that ?next= cannot be used for an open redirect.
export function safeNextPath(
  value: unknown,
  fallback: string = HOME_PATH,
): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return fallback;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback;
  }
  // Control characters (tabs, new lines) can be stripped by browsers and
  // turn the path into something else.
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return fallback;
  }
  return value;
}

// Where email links (signup confirmation, password reset) send the user.
// The email templates append &token_hash=…&type=… to this URL, so it must
// always carry a query string (see supabase/templates/README.md).
export function authConfirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(safeNextPath(next))}`;
}
