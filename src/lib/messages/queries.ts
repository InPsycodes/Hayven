import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBookedTherapistInfo } from "@/lib/therapist/booked-names";

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

const THREAD_LIST_LIMIT = 50;

/**
 * One thread per confirmed/completed booking, even before a first message is sent. Runs on every
 * page load via the nav sidebar's unread badge (see AppShell), so it's bounded and batches the
 * counterpart-name lookup into one query instead of one per booking. Wrapped in cache() -- the
 * dashboard page itself also calls this for its own message preview, so within a single request
 * this was hitting the DB twice for identical data; a live pre-launch performance audit flagged
 * the resulting dashboard TTFB as a real, measurable regression versus the marketing pages.
 */
export const getRealMessageThreadsForParent = cache(async function getRealMessageThreadsForParent(
  parentId: string
): Promise<RealThreadPreview[]> {
  const supabase = await createClient();
  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, therapist_id, created_at")
    .eq("parent_id", parentId)
    .in("status", ["confirmed", "completed"])
    .order("created_at", { ascending: false })
    .limit(THREAD_LIST_LIMIT);
  if (!bookingsData || bookingsData.length === 0) return [];

  const therapistIds = [...new Set(bookingsData.map((b) => b.therapist_id))];
  const therapistInfo = await getBookedTherapistInfo(therapistIds);

  return Promise.all(
    bookingsData.map(async (b) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, sender_id")
        .eq("booking_id", b.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        bookingId: b.id,
        counterpartName: therapistInfo.get(b.therapist_id)?.displayName ?? "Therapist",
        lastMessage: lastMsg?.content ?? null,
        lastMessageSenderId: lastMsg?.sender_id ?? null,
      };
    })
  );
});

/**
 * Uses the admin client to resolve the parent's display name -- there's no
 * public-facing view for parent profiles (unlike therapist_public_profiles),
 * so a therapist reading a booking counterpart's name goes through
 * server-only trusted code rather than a broadened RLS policy on `users`.
 * Wrapped in cache() for the same reason as getRealMessageThreadsForParent
 * above -- AppShell's sidebar badge and the therapist dashboard page both
 * call this with the same argument within one request.
 */
export const getRealMessageThreadsForTherapist = cache(async function getRealMessageThreadsForTherapist(
  therapistProfileId: string
): Promise<RealThreadPreview[]> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, parent_id, created_at")
    .eq("therapist_id", therapistProfileId)
    .in("status", ["confirmed", "completed"])
    .order("created_at", { ascending: false })
    .limit(THREAD_LIST_LIMIT);
  if (!bookingsData || bookingsData.length === 0) return [];

  const parentIds = [...new Set(bookingsData.map((b) => b.parent_id))];
  const { data: parentRows } = await admin.from("users").select("id, full_name").in("id", parentIds);
  const parentNameById = new Map((parentRows ?? []).map((u) => [u.id, u.full_name]));

  return Promise.all(
    bookingsData.map(async (b) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, sender_id")
        .eq("booking_id", b.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        bookingId: b.id,
        counterpartName: parentNameById.get(b.parent_id) ?? "Parent",
        lastMessage: lastMsg?.content ?? null,
        lastMessageSenderId: lastMsg?.sender_id ?? null,
      };
    })
  );
});
