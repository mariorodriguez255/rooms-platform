import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { LOGIN_PATH, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Landing point of the links in auth emails (signup confirmation and
// password reset, see supabase/templates/). Verifies the one-time token,
// which writes the session cookies, and continues to ?next=.
const EMAIL_LINK_TYPES = new Set<EmailOtpType>(["email", "signup", "recovery"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && EMAIL_LINK_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      redirect(safeNextPath(searchParams.get("next")));
    }
  }

  redirect(`${LOGIN_PATH}?error=link_invalid`);
}
