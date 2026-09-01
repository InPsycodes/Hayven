"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickEmailPreferences, type EmailPreferences } from "@/lib/notifications/preferences";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", session.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/parent", "layout");
  revalidatePath("/therapist", "layout");
  revalidatePath("/supervisor", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", session.userId)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/parent", "layout");
  revalidatePath("/therapist", "layout");
  revalidatePath("/supervisor", "layout");
  return { ok: true };
}

/**
 * Called from the parent reports page on load. Scoped to "any report
 * notification", not the specific report being viewed -- entity_id is a
 * report id, and joining that back to "is this the report on screen right
 * now" isn't worth the extra query for a notification-bell-adjacent read
 * receipt. Worst case a reminder that would've fired doesn't, because the
 * parent was already looking at their reports section.
 */
export async function markReportNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", session.userId)
    .eq("entity_type", "report")
    .eq("read", false);
}

// --- email preferences --------------------------------------------------

/** Logged-in path: a user editing their own email preferences. */
export async function updateMyEmailPreferences(patch: Partial<EmailPreferences>): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const clean = pickEmailPreferences(patch);
  if (Object.keys(clean).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: session.userId, ...clean, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/parent/profile");
  revalidatePath("/therapist/profile");
  return { ok: true };
}

/** Login-free path from an email's unsubscribe link. */
export async function updateEmailPreferencesByToken(
  token: string,
  patch: Partial<EmailPreferences>
): Promise<ActionResult> {
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return { ok: false, error: "This link is invalid or has expired." };

  const clean = pickEmailPreferences(patch);
  if (Object.keys(clean).length === 0) return { ok: true };

  const admin = createAdminClient();
  const { error } = await admin
    .from("notification_preferences")
    .upsert(
      { user_id: userId, ...clean, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
