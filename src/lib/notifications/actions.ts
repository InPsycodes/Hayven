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
