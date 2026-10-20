import type { Messages } from "next-intl";

// Maps errors from Supabase (Auth codes and the codes our SQL functions
// raise) to a key of the "errors" messages. Anything unknown becomes
// "unexpected": internal messages are never shown to the user.

export type ErrorKey = keyof Messages["errors"];

// A Map, not an object: "constructor" or "toString" must not match.
const KNOWN_ERRORS = new Map<string, ErrorKey>(
  Object.entries({
    // Supabase Auth (error.code)
    invalid_credentials: "invalidCredentials",
    email_not_confirmed: "emailNotConfirmed",
    over_email_send_rate_limit: "rateLimited",
    over_request_rate_limit: "rateLimited",
    weak_password: "weakPassword", // secret-scan:allow (message key)
    same_password: "samePassword", // secret-scan:allow (message key)
    reauthentication_needed: "reauthenticationNeeded",
    // supabase/migrations (raise exception '<code>')
    insufficient_role: "insufficientRole",
    last_owner: "lastOwner",
    organization_limit: "organizationLimit",
    already_member: "alreadyMember",
    invitation_limit: "invitationLimit",
    invitation_invalid: "invitationInvalid",
    invitation_expired: "invitationExpired",
    invitation_email_mismatch: "invitationEmailMismatch",
  } satisfies Record<string, ErrorKey>),
);

type ErrorLike = { code?: string | undefined; message?: string | undefined };

export function errorKeyFrom(error: ErrorLike | null | undefined): ErrorKey {
  if (!error) return "unexpected";
  // Auth errors carry the code in `code`; database errors raised by our
  // functions carry it in `message` (their `code` is the SQLSTATE).
  for (const candidate of [error.code, error.message]) {
    const key = candidate ? KNOWN_ERRORS.get(candidate) : undefined;
    if (key) return key;
  }
  return "unexpected";
}
