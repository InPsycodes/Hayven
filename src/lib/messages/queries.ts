import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RealMessage {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  sentAt: string;
}

export async function getRealMessagesForBooking(bookingId: string): Promise<RealMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, booking_id, sender_id, content, sent_at")
    .eq("booking_id", bookingId)
    .order("sent_at", { ascending: true });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    senderId: row.sender_id,
    content: row.content,
    sentAt: row.sent_at,
  }));
}

export interface RealThreadPreview {
  bookingId: string;
  counterpartName: string;
  lastMessage: string | null;
  /** Who sent the last message -- there's no read-tracking column in the schema, so this is the closest honest proxy for "awaiting your reply." */
  lastMessageSenderId: string | null;
}

/** One thread per confirmed/completed booking, even before a first message is sent. */
export async function getRealMessageThreadsForParent(parentId: string): Promise<RealThreadPreview[]> {
  const supabase = await createClient();
  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, therapist_id, created_at")
    .eq("parent_id", parentId)
    .in("status", ["confirmed", "completed"])
    .order("created_at", { ascending: false });
  if (!bookingsData || bookingsData.length === 0) return [];

  return Promise.all(
    bookingsData.map(async (b) => {
      const [{ data: therapistPublic }, { data: lastMsg }] = await Promise.all([
        supabase.from("therapist_public_profiles").select("display_name").eq("id", b.therapist_id).maybeSingle(),
        supabase
          .from("messages")
          .select("content, sender_id")
          .eq("booking_id", b.id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        bookingId: b.id,
        counterpartName: therapistPublic?.display_name ?? "Therapist",
        lastMessage: lastMsg?.content ?? null,
        lastMessageSenderId: lastMsg?.sender_id ?? null,
      };
    })
  );
}

/**
 * Uses the admin client to resolve the parent's display name -- there's no
 * public-facing view for parent profiles (unlike therapist_public_profiles),
 * so a therapist reading a booking counterpart's name goes through
 * server-only trusted code rather than a broadened RLS policy on `users`.
 */
export async function getRealMessageThreadsForTherapist(
  therapistProfileId: string
): Promise<RealThreadPreview[]> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, parent_id, created_at")
    .eq("therapist_id", therapistProfileId)
    .in("status", ["confirmed", "completed"])
    .order("created_at", { ascending: false });
  if (!bookingsData || bookingsData.length === 0) return [];

  return Promise.all(
    bookingsData.map(async (b) => {
      const [{ data: parentUser }, { data: lastMsg }] = await Promise.all([
        admin.from("users").select("full_name").eq("id", b.parent_id).maybeSingle(),
        supabase
          .from("messages")
          .select("content, sender_id")
          .eq("booking_id", b.id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        bookingId: b.id,
        counterpartName: parentUser?.full_name ?? "Parent",
        lastMessage: lastMsg?.content ?? null,
        lastMessageSenderId: lastMsg?.sender_id ?? null,
      };
    })
  );
}
