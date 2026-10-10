import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";

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
  const OTP_TYPES = ["recovery", "email", "signup", "invite", "magiclink", "email_change"] as const;
  const rawType = searchParams.get("type") ?? "recovery";
  // rawType is attacker-controlled (a query param) -- validate against the
  // allowlist instead of casting straight into verifyOtp's union type. A
  // mismatched type just fails verification either way, but this closes the
  // gap between the TS type and what's actually trusted at runtime (L-16,
  // production audit 2026-09-03).
  const type = (OTP_TYPES as readonly string[]).includes(rawType) ? (rawType as (typeof OTP_TYPES)[number]) : "recovery";

  const nextParam = searchParams.get("next") ?? "/";
  const next = safeNextPath(nextParam) ?? "/";

  const dest = request.nextUrl.clone();
  dest.search = "";

  const supabase = await createClient();
  let verified = false;

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  dest.pathname = verified ? next : "/forgot-password";
  if (!verified) dest.searchParams.set("error", "expired");
  return NextResponse.redirect(dest);
}
