"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit/check";
import type { UserRole } from "@/data/types";

export interface SignUpInput {
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  agreedToTerms: boolean;
}

export type SignUpResult =
  | { ok: true; role: UserRole; needsEmailConfirmation: false }
  | { ok: true; needsEmailConfirmation: true }
  | { ok: false; error: string };

export type SignInResult =
  | { ok: true; role: UserRole }
  | { ok: true; mfaRequired: true; factorId: string }
  | { ok: false; error: string };

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  // Signup is the only self-service path into this function, and the UI only
  // ever offers "parent"/"therapist" -- reject anything else outright rather
  // than trust a caller-supplied role, since that field ends up in auth
  // metadata a DB trigger uses to set the account's real privilege level.
  if (input.role !== "parent" && input.role !== "therapist") {
    return { ok: false, error: "Invalid account type." };
  }
  if (!input.agreedToTerms) {
    return { ok: false, error: "Please agree to the Privacy Policy and Terms of Service to continue." };
  }

  // Same shape as signIn's rate limit, keyed by the submitted email --
  // without this, signup can be scripted to spam Supabase's confirmation
  // email at one target address indefinitely.
  const allowed = await checkRateLimit(`signup:${input.email.trim().toLowerCase()}`, 5, 15 * 60);
  if (!allowed) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: input.role,
        full_name: input.fullName,
        phone: input.phone,
      },
    },
  });

  if (error) {
    // Softened rather than an explicit "you already have an account" --
    // that phrasing is a clean account-enumeration oracle (anyone can learn
    // who's on the platform just by trying to sign up with their email),
    // which matters more than usual for a child-therapy app. This doesn't
    // fully close that channel (a distinct error vs. instant success is
    // still a signal) -- doing that properly needs signup gated on email
    // confirmation, which needs a verified sending domain we don't have
    // yet. The signup rate limit above at least caps how fast someone can
    // probe emails at scale in the meantime.
    if (error.code === "user_already_exists") {
      return {
        ok: false,
        error: "We couldn't create your account with these details. If you already have one, try logging in instead.",
      };
    }
    return { ok: false, error: error.message };
  }
  if (!data.user) return { ok: false, error: "Something went wrong creating your account. Please try again." };

  // Service-role, not the session-scoped client above: when email
  // confirmation is required there's no active session yet to satisfy
  // an `auth.uid() = id` RLS policy, but consent still needs recording
  // against the row the handle_new_user trigger just created.
  const admin = createAdminClient();
  await admin
    .from("users")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", data.user.id);

  // Supabase's "Confirm email" setting controls whether a session comes
  // back immediately or the user has to click a confirmation link first.
  if (!data.session) {
    return { ok: true, needsEmailConfirmation: true };
  }

  return { ok: true, role: input.role, needsEmailConfirmation: false };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  // Checked -- and counted -- before the password is ever verified, so a
  // brute-force attempt is blocked regardless of whether individual guesses
  // succeed or fail. Keyed by email rather than IP: the actual risk here is
  // someone hammering one known account, not a single source hammering many,
  // and it sidesteps needing a reliable client-IP header behind Netlify's
  // proxy layer.
  const allowed = await checkRateLimit(`login:${email.trim().toLowerCase()}`, 5, 15 * 60);
  if (!allowed) {
    return { ok: false, error: "Too many login attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", data.user.id)
    .single();
  if (!profile) {
    return { ok: false, error: "Account setup isn't finished yet. Please try again shortly." };
  }

  // Checked before MFA, with an explicit message -- getSession() also
  // enforces this everywhere else, but silently failing here would leave
  // someone stuck in a confusing "password worked, then nothing loads" loop
  // instead of a clear explanation. This is the actual mechanism the
  // incident response plan's "suspend a compromised account" step relies on.
  if (profile.status === "suspended") {
    return { ok: false, error: "This account has been suspended. Contact support for help." };
  }

  // Password verified is only AAL1 -- an account with an enrolled MFA
  // factor needs the second-factor step before it's a completed login.
  // getSession() enforces this same check everywhere else in the app; this
  // is what turns it into an explicit "enter your code" prompt instead of a
  // confusing bounce back to /login on the very next page load.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factorId = factors?.totp.find((f) => f.status === "verified")?.id;
    if (!factorId) {
      return { ok: false, error: "Couldn't complete two-factor sign-in. Please try again." };
    }
    return { ok: true, mfaRequired: true, factorId };
  }

  return { ok: true, role: profile.role as UserRole };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
