"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { checkRateLimit } from "@/lib/rate-limit/check";

export interface ChangePasswordState {
  error?: string;
  done?: boolean;
}

/**
 * Change password for a signed-in user. The current password is re-checked
 * first, so an unlocked device left open can't be used to take the account
 * over. That check runs on a throwaway, non-persisting client: a failed
 * sign-in on the cookie client could disturb the session the user is
 * actually browsing with, and the throwaway session doubles as the "recent
 * sign-in" Supabase's secure password change setting asks for.
 *
 * Afterwards every other device is signed out (this one stays signed in),
 * and the account holder is told by in-app notification and email, the
 * same as when an admin resets a password (resetUserAccountPassword).
 */
export async function changePassword(_prevState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) return { error: "You must be signed in to change your password." };

  const current = formData.get("currentPassword");
  const next = formData.get("newPassword");
  const confirm = formData.get("confirmPassword");
  if (typeof current !== "string" || !current) return { error: "Enter your current password." };
  if (typeof next !== "string" || next.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (next === current) return { error: "Choose a password different from your current one." };

  // Keyed by account, not IP: this is the guard against guessing the
  // current password from a hijacked session.
  const allowed = await checkRateLimit(`pwchange:${session.userId}`, 5, 15 * 60);
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You must be signed in to change your password." };

  const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
  if (signInError) return { error: "Your current password isn't right." };

  const { error: updateError } = await verifier.auth.updateUser({ password: next });
  // Drop the throwaway session whatever happened; scope "local" leaves the
  // browser's own session alone.
  await verifier.auth.signOut({ scope: "local" });
  if (updateError) return { error: updateError.message };

  await supabase.auth.signOut({ scope: "others" });

  await logAuditEvent({ actor: session, action: "account.change_password", entityType: "user", entityId: session.userId });

  await createNotification({
    userId: session.userId,
    type: "verification_update",
    title: "Your password was changed",
    body: "The password on your Hayven account was just changed, and any other devices were signed out. If this wasn't you, contact support immediately.",
  });

  return { done: true };
}
