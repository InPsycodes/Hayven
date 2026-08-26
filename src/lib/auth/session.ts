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
export const getSession = cache(async function getSession(): Promise<AppSession | null> {
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

  return {
    userId: user.id,
    role: profile.role as UserRole,
    name: profile.full_name as string,
    isSupervisor: profile.is_supervisor === true,
  };
});
