import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/data/types";

export interface AppSession {
  userId: string;
  role: UserRole;
  name: string;
  /** Additive: a therapist can hold this alongside role === "therapist" and keep full access to their own practice. See migration 0054. */
  isSupervisor: boolean;
}

/**
 * Real, server-side session: the authenticated Supabase user + their public.users profile.
 *
 * Wrapped in React's cache() -- this is called from every layout, every
 * page, and most server actions in the app, and does 3 sequential network
 * round trips (auth.getUser, mfa.getAuthenticatorAssuranceLevel, a users
 * table select) each time. cache() only memoizes within a single request's
 * render pass, reset on the next request, so this does NOT reintroduce a
 * stale-session window: a suspended account is still rejected on its very
 * next request, exactly as before (confirmed via a live pre-launch audit
 * that specifically tested this). It just stops paying for the same 3
 * round trips 2-4x over on every single page load.
 */
export const getSession = cache(async function getSession(allowUnenrolledAdmin = false): Promise<AppSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // A password-only (AAL1) session for an account with an enrolled MFA
  // factor is not a completed login. Every server action in this app starts
  // with `getSession()`, so enforcing the step-up here -- the one place
  // everything already checks -- makes MFA a real boundary everywhere at
  // once, instead of a login-form prompt someone could skip by calling an
  // action directly with just the password-stage session cookie.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, status, is_supervisor")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  // `status` exists on every account specifically for incident containment
  // (suspending a compromised or abusive account) -- it's meaningless if
  // nothing actually checks it. Same choke point as the MFA/AAL check above.
  if (profile.status === "suspended") return null;

  // E8 (external PRD review), found on a "CHECK ALL" recheck: the step-up
  // check above only fires once a factor exists (nextLevel only ever becomes
  // "aal2" that way), so an admin account with ZERO factors enrolled sailed
  // through it forever. proxy.ts's page-navigation gate caught that for
  // normal browsing, but src/app/api/admin/seed-learning-articles/route.ts
  // -- a route with its own independent getSession()-based check, entirely
  // outside proxy.ts's matcher (which excludes all of /api/) -- proved it
  // was a real bypass: a compromised admin password with no MFA enrolled had
  // no MFA barrier at all calling it directly. Same choke point as the two
  // checks above closes it for every current and future admin action or
  // route, not just the one found. allowUnenrolledAdmin is a narrow, explicit
  // opt-out for the one legitimate case a zero-factor admin must still pass
  // this check: enrolling a factor in the first place (src/lib/auth/
  // mfa-actions.ts's enrollMfa/confirmMfaEnrollment/unenrollMfa/getMfaStatus,
  // the only callers that pass it) -- a plain boolean, not an options object,
  // so repeated no-arg calls within one request still hit React cache()'s
  // same entry instead of each other re-paying the 3 round trips this
  // wrapper exists to avoid.
  if (profile.role === "admin" && !allowUnenrolledAdmin && (!aal || aal.nextLevel !== "aal2")) return null;

  return {
    userId: user.id,
    role: profile.role as UserRole,
    name: profile.full_name as string,
    isSupervisor: profile.is_supervisor === true,
  };
});
