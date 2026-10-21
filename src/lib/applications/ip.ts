import { createHmac } from "node:crypto";

// The candidate's IP, for rate limiting and as proof in `consents`. Only a
// keyed hash is stored: a plain SHA-256 of an IPv4 address could be
// reversed by trying all 4 billion of them, but not without the secret.

type HeaderReader = { get(name: string): string | null };

// Leftmost X-Forwarded-For entry. On Vercel it is reliable: Vercel sets
// that header itself and overwrites whatever the client sent. Null when
// unknown (e.g. some local setups).
export function clientIp(headers: HeaderReader): string | null {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || null;
}

export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}
