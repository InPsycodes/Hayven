"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/data/types";

export interface SignUpInput {
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  password: string;
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

  // Supabase's "Confirm email" setting controls whether a session comes
  // back immediately or the user has to click a confirmation link first.
  if (!data.session || !data.user) {
    return { ok: true, needsEmailConfirmation: true };
  }

  return { ok: true, role: input.role, needsEmailConfirmation: false };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
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
