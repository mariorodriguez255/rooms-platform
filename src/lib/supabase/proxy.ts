import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { HOME_PATH, LOGIN_PATH, routeAccess } from "@/lib/auth/routes";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

// Runs before every page (see src/proxy.ts). Refreshes the session cookies,
// which Server Components cannot write, and redirects according to the
// route's access rules.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Refreshed tokens go both to the request (for the page rendering
          // now) and to the response (for the browser).
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // no-store headers: a response that sets a session must never be
          // cached and served to someone else.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Nothing may run between creating the client and getClaims(): it is what
  // refreshes an expired token. getClaims() verifies the JWT signature.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const access = routeAccess(pathname);

  if (access === "protected" && !signedIn) {
    return redirectKeepingCookies(request, response, LOGIN_PATH, {
      next: pathname + search,
    });
  }
  if (access === "guest-only" && signedIn) {
    return redirectKeepingCookies(request, response, HOME_PATH);
  }
  return response;
}

function redirectKeepingCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  params: Record<string, string> = {},
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = new URLSearchParams(params).toString();
  const redirect = NextResponse.redirect(url);
  // Keep any refreshed session cookies and no-store headers.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}
