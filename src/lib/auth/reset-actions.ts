"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit/check";

type Result = { ok: true } | { ok: false; error: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Sends a password-reset email. Always reports success even when the address
 * has no account -- a distinct "no such account" response is a clean
 * enumeration oracle, the same reasoning signUp/signIn already follow. The
 * rate limit is keyed by the submitted email so one address can't be used to
 * spam Supabase's mailer.
 */
export async function requestPasswordReset(email: string): Promise<Result> {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes("@")) return { ok: false, error: "Enter a valid email address." };

  const allowed = await checkRateLimit(`pwreset:${clean}`, 5, 15 * 60);
  if (!allowed) {
    return { ok: false, error: "Too many requests. Please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    // The email template points at /auth/confirm with a token_hash; this
    // redirectTo only matters if the template is left on Supabase's default
    // {{ .ConfirmationURL }}, where the route handler's `code` branch handles it.
    redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
  });
  if (error) console.error("resetPasswordForEmail failed", error.message);

  return { ok: true };
}

/**
 * Sets a new password for the user currently in the (short-lived) recovery
 * session established by /auth/confirm. Signs them out afterwards so they log
 * back in fresh with the new password.
 */
export async function updatePassword(password: string): Promise<Result> {
  if (password.length < 8) return { ok: false, error: "Use at least 8 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  await supabase.auth.signOut();
  return { ok: true };
}
