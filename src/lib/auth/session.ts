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
 * page, and most server actions in the app, and does 2 sequential network
 * round trips (auth.getUser, a users table select) each time. cache() only
 * memoizes within a single request's render pass, reset on the next
 * request, so this does NOT reintroduce a stale-session window: a suspended
 * account is still rejected on its very next request.
 *
 * Two-factor authentication was removed on 2026-10-09 at the owner's
 * decision (no account had a factor enrolled). Sign-in is password or
 * Google only; nothing here checks an authenticator assurance level.
 */
export const getSession = cache(async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, status, is_supervisor")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  // `status` exists on every account specifically for incident containment
  // (suspending a compromised or abusive account) -- it's meaningless if
  // nothing actually checks it, and every action already goes through here.
  if (profile.status === "suspended") return null;

  return {
    userId: user.id,
    role: profile.role as UserRole,
    name: profile.full_name as string,
    isSupervisor: profile.is_supervisor === true,
  };
});
