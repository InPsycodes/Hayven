"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function sendRealMessage(
  bookingId: string,
  content: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "You must be signed in to send a message." };
  if (!content.trim()) return { ok: false, error: "Message can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    booking_id: bookingId,
    sender_id: session.userId,
    content: content.trim(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/parent/messages/${bookingId}`);
  revalidatePath(`/therapist/messages/${bookingId}`);
  return { ok: true };
}
