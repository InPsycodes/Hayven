"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit/check";

export type EnrollMfaResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

const NOT_SIGNED_IN_ERROR = "You must be signed in to enable two-factor authentication.";

/** Starts TOTP enrollment -- returns a QR code (SVG data URI) and the raw
 * secret as a manual-entry fallback for authenticator apps that can't scan. */
export async function enrollMfa(): Promise<EnrollMfaResult> {
  // getSession(), not a raw getUser() check -- these are plain server actions,
  // independently reachable regardless of which page renders their UI, so
  // this is the only thing standing between a suspended account's still-valid
  // session cookie and enrolling a fresh MFA factor as a persistent backdoor.
  const session = await getSession();
  if (!session) return { ok: false, error: NOT_SIGNED_IN_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** Completes enrollment -- until this succeeds, the factor exists but is
 * unverified and getSession()'s AAL check ignores it. */
export async function confirmMfaEnrollment(
  factorId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: NOT_SIGNED_IN_ERROR };

  const supabase = await createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { ok: false, error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) return { ok: false, error: "Incorrect code. Please try again." };

  revalidatePath("/parent/profile");
  revalidatePath("/therapist/profile");
  revalidatePath("/supervisor/settings");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Requires a fresh TOTP code, not just an already-AAL2 session -- a session
 * being AAL2 only proves MFA was completed at some point in the past, which
 * a stolen/hijacked cookie (e.g. via XSS) would already satisfy without the
 * attacker ever possessing the actual authenticator secret. Re-checking a
 * live code here means turning 2FA off still requires proving possession of
 * it right now, the same guarantee logging in with it does.
 */
export async function unenrollMfa(
  factorId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: NOT_SIGNED_IN_ERROR };

  const allowed = await checkRateLimit(`mfa-unenroll:${factorId}`, 5, 15 * 60);
  if (!allowed) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { ok: false, error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) return { ok: false, error: "Incorrect code. Please try again." };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/parent/profile");
  revalidatePath("/therapist/profile");
  revalidatePath("/supervisor/settings");
  revalidatePath("/admin/settings");
  return { ok: true };
}

export interface MfaStatus {
  enrolled: boolean;
  factorId: string | null;
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const session = await getSession();
  if (!session) return { enrolled: false, factorId: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return { enrolled: false, factorId: null };

  const verified = data.totp.find((f) => f.status === "verified");
  return { enrolled: !!verified, factorId: verified?.id ?? null };
}

/** The login-time step-up: completes the challenge for an already
 * password-verified (AAL1) session, elevating it to AAL2 so getSession()
 * starts returning non-null again. */
export async function verifyMfaLogin(
  factorId: string,
  code: string
): Promise<{ ok: true; role: string } | { ok: false; error: string }> {
  // Same reasoning as signIn's rate limit: an attacker who already has a
  // valid password (AAL1 session, which is all that's needed to call this
  // action) would otherwise be able to script unlimited 6-digit TOTP
  // guesses against the second factor. Keyed by factorId -- a stable,
  // non-guessable per-user identifier -- so this doesn't require a second
  // round trip to look up the user before the limit is even checked.
  const allowed = await checkRateLimit(`mfa-login:${factorId}`, 5, 15 * 60);
  if (!allowed) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { ok: false, error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) return { ok: false, error: "Incorrect code. Please try again." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please log in again." };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile) return { ok: false, error: "Account setup isn't finished yet. Please try again shortly." };

  return { ok: true, role: profile.role as string };
}
