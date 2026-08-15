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

export type SignInResult = { ok: true; role: UserRole } | { ok: false; error: string };

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

  if (error) return { ok: false, error: error.message };
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
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (!profile) {
    return { ok: false, error: "Account setup isn't finished yet. Please try again shortly." };
  }

  return { ok: true, role: profile.role as UserRole };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
