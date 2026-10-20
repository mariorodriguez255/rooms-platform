import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { LOGIN_PATH } from "@/lib/auth/routes";
import { destinationAfterSignIn } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Landing point of the links in auth emails (signup confirmation and
// password reset). It accepts the two kinds of link Supabase can send:
//
// - ?code=        default templates (used until there is a custom SMTP).
//                 Supabase has already verified the email; the code is
//                 exchanged for a session (PKCE). That needs the verifier
//                 cookie, so it only works in the browser that asked for it.
// - ?token_hash=  our own templates (supabase/templates/). Works in any
//                 browser. To be enabled with the custom SMTP (milestone 3).
//
// Either way it continues to ?next=.
const EMAIL_LINK_TYPES = new Set<EmailOtpType>(["email", "signup", "recovery"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = searchParams.get("next");
  // Supabase reports an expired or already used link with error_code.
  if (searchParams.has("error_code")) {
    redirect(`${LOGIN_PATH}?error=link_invalid`);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(await destinationAfterSignIn(supabase, next));
    // Usually the link was opened in another browser. A signup email is
    // confirmed anyway: the user only has to sign in.
    redirect(`${LOGIN_PATH}?error=link_other_browser`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && EMAIL_LINK_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect(await destinationAfterSignIn(supabase, next));
  }

  redirect(`${LOGIN_PATH}?error=link_invalid`);
}
