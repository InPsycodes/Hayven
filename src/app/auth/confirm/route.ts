import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for email links (password recovery, and any future email
 * confirmation). Verifies the token, which sets the session cookie, then
 * redirects to `next` -- a relative path only, so this can't be turned into
 * an open redirect.
 *
 * Handles both link styles:
 *  - token_hash (Supabase's recommended SSR flow, cross-device safe) via verifyOtp
 *  - code (the default {{ .ConfirmationURL }} template, same-device) via exchangeCodeForSession
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") ?? "recovery";

  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const dest = request.nextUrl.clone();
  dest.search = "";

  const supabase = await createClient();
  let verified = false;

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email" | "signup" | "invite" | "magiclink" | "email_change",
      token_hash: tokenHash,
    });
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  dest.pathname = verified ? next : "/forgot-password";
  if (!verified) dest.searchParams.set("error", "expired");
  return NextResponse.redirect(dest);
}
