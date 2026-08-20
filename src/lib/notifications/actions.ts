"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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
