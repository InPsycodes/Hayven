import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { UserRole } from "@/data/types";

/**
 * Refreshes the Supabase session cookie (the whole point -- this is the only
 * place a rotated token gets written back, since a Server Component's
 * setAll is a no-op) and, when `resolveRole` is set, also looks up the
 * caller's app role for proxy.ts's route gate.
 */
export async function updateSupabaseSession(request: NextRequest, resolveRole = true) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // @supabase/ssr's own default cookie options never include `secure`
          // (confirmed by reading the package source -- DEFAULT_COOKIE_OPTIONS
          // only sets path/sameSite/httpOnly/maxAge), so the session cookie
          // was shipping without the Secure attribute even in production,
          // confirmed via a live login. Guarded by NODE_ENV so it still works
          // over plain http://localhost in dev.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, secure: process.env.NODE_ENV === "production" })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  let isSupervisor = false;
  let mfaEnrolled = false;
  if (user && resolveRole) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_supervisor")
      .eq("id", user.id)
      .single();
    role = (profile?.role as UserRole) ?? null;
    isSupervisor = profile?.is_supervisor === true;

    // nextLevel only ever becomes "aal2" once a verified factor exists on
    // the account -- true here regardless of whether *this* session has
    // actually stepped up to it yet. That per-session step-up is a
    // different, already-covered check: getSession() (src/lib/auth/
    // session.ts) separately rejects a session sitting at aal1 when
    // nextLevel is aal2, on every page load, for every role. What nothing
    // checked before this was whether an admin had enrolled a factor AT
    // ALL -- nextLevel just stays "aal1" forever for an account with zero
    // factors, and getSession()'s check never fires because there's
    // nothing to step up to.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    mfaEnrolled = aal?.nextLevel === "aal2";
  }

  return { response, user, role, isSupervisor, mfaEnrolled };
}
