"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { checkRateLimit } from "@/lib/rate-limit/check";

export async function sendRealMessage(
  bookingId: string,
  content: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "You must be signed in to send a message." };
  if (!content.trim()) return { ok: false, error: "Message can't be empty." };

  // No natural cap otherwise -- each message also fires an email + push
  // notification to the recipient, so an unthrottled sender can flood both
  // the thread and the other person's inbox/phone.
  const allowed = await checkRateLimit(`message:${session.userId}`, 60, 10 * 60);
  if (!allowed) return { ok: false, error: "You're sending messages too quickly. Please slow down." };

  const trimmed = content.trim();
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    booking_id: bookingId,
    sender_id: session.userId,
    content: trimmed,
  });
  if (error) return { ok: false, error: error.message };

  const { data: booking } = await supabase
    .from("bookings")
    .select("parent_id, therapist_profiles(user_id)")
    .eq("id", bookingId)
    .maybeSingle();
  if (booking) {
    const therapistProfile = booking.therapist_profiles as unknown as { user_id: string } | null;
    const recipientId = session.userId === booking.parent_id ? therapistProfile?.user_id : booking.parent_id;
    if (recipientId) {
      await createNotification({
        userId: recipientId,
        type: "new_message",
        title: `New message from ${session.name}`,
        body: trimmed.slice(0, 140),
      });
    }
  }

  revalidatePath(`/parent/messages/${bookingId}`);
  revalidatePath(`/therapist/messages/${bookingId}`);
  return { ok: true };
}
