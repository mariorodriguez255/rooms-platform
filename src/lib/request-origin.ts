import "server-only";

import { headers } from "next/headers";

// Origin of the deployment handling the request (localhost, a Vercel
// preview or production), used to build links in auth emails. Next.js
// already rejects Server Actions whose Origin does not match the host, and
// Supabase Auth only accepts redirect URLs from its allow list.
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) throw new Error("Cannot determine the request origin");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
