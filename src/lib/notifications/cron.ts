import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

type BookingRow = {
  id: string;
  parent_id: string;
  children: { first_name: string } | null;
  availability_slots: { start_time: string; end_time: string } | null;
  therapist_profiles: { users: { full_name: string } | null } | null;
};

/** Notification types already fired against this exact booking, keyed by booking id, for a given notification type -- one batched query instead of one existence check per row. */
async function alreadyNotifiedIds(
  admin: ReturnType<typeof createAdminClient>,
  type: "session_started" | "session_finished",
  candidateIds: string[]
): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();
  const { data } = await admin
    .from("notifications")
    .select("entity_id")
    .eq("type", type)
    .eq("entity_type", "booking")
    .in("entity_id", candidateIds);
  return new Set((data ?? []).map((r) => r.entity_id as string));
}

/**
 * Scans confirmed bookings whose slot has already started, notifies the
 * parent once per booking (dedup via notifications.entity_id, see
 * alreadyNotifiedIds). Deliberately doesn't touch booking.status -- "started"
 * has no status of its own, it's purely a notification-side event.
 */
export async function notifySessionsStarted(): Promise<number> {
  const admin = createAdminClient();
  const { data: raw } = await admin
    .from("bookings")
    .select("id, parent_id, children(first_name), availability_slots(start_time, end_time), therapist_profiles(users(full_name))")
    .eq("status", "confirmed");
  const data = raw as unknown as BookingRow[] | null;
  if (!data) return 0;

  const nowMs = Date.now();
  const started = data.filter((b) => b.availability_slots && new Date(b.availability_slots.start_time).getTime() <= nowMs);
  const skip = await alreadyNotifiedIds(admin, "session_started", started.map((b) => b.id));

  let count = 0;
  for (const booking of started) {
    if (skip.has(booking.id)) continue;
    const childName = booking.children?.first_name ?? "Your child";
    const therapistName = booking.therapist_profiles?.users?.full_name ?? "their therapist";
    await createNotification({
      userId: booking.parent_id,
      type: "session_started",
      entityType: "booking",
      entityId: booking.id,
      title: `${childName}'s session has started`,
      body: `${childName}'s session with ${therapistName} just began.`,
      url: "/parent/sessions",
    });
    count++;
  }
  return count;
}

/**
 * Scans confirmed bookings whose slot has already ended: transitions status
 * to completed (same conditional-guarded update autoCompletePastBookings
 * already does lazily on read -- this runs independently and harmlessly
 * overlaps it) and notifies the parent once per booking.
 */
export async function notifySessionsFinished(): Promise<number> {
  const admin = createAdminClient();
  const { data: raw } = await admin
    .from("bookings")
    .select("id, parent_id, children(first_name), availability_slots(start_time, end_time), therapist_profiles(users(full_name))")
    .eq("status", "confirmed");
  const data = raw as unknown as BookingRow[] | null;
  if (!data) return 0;

  const nowMs = Date.now();
  const finished = data.filter((b) => b.availability_slots && new Date(b.availability_slots.end_time).getTime() <= nowMs);
  if (finished.length === 0) return 0;

  await admin
    .from("bookings")
    .update({ status: "completed" })
    .in("id", finished.map((b) => b.id))
    .eq("status", "confirmed");

  const skip = await alreadyNotifiedIds(admin, "session_finished", finished.map((b) => b.id));

  let count = 0;
  for (const booking of finished) {
    if (skip.has(booking.id)) continue;
    const childName = booking.children?.first_name ?? "Your child";
    const therapistName = booking.therapist_profiles?.users?.full_name ?? "their therapist";
    await createNotification({
      userId: booking.parent_id,
      type: "session_finished",
      entityType: "booking",
      entityId: booking.id,
      title: `${childName}'s session has ended`,
      body: `${childName}'s session with ${therapistName} just wrapped up.`,
      url: "/parent/sessions",
    });
    count++;
  }
  return count;
}

const REMINDER_DELAY_HOURS = 48;

/**
 * One reminder per report, sent once: a report_published notification that's
 * still unread REMINDER_DELAY_HOURS after publish, and doesn't already have
 * a report_reminder notification for the same report id.
 */
export async function notifyUnreadReportReminders(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REMINDER_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: unread } = await admin
    .from("notifications")
    .select("id, user_id, entity_id, title")
    .eq("type", "report_published")
    .eq("read", false)
    .lt("created_at", cutoff);
  if (!unread || unread.length === 0) return 0;

  const reportIds = unread.map((n) => n.entity_id).filter((id): id is string => !!id);
  const { data: alreadyReminded } = await admin
    .from("notifications")
    .select("entity_id")
    .eq("type", "report_reminder")
    .eq("entity_type", "report")
    .in("entity_id", reportIds);
  const reminded = new Set((alreadyReminded ?? []).map((r) => r.entity_id as string));

  let count = 0;
  for (const n of unread) {
    if (!n.entity_id || reminded.has(n.entity_id)) continue;
    await createNotification({
      userId: n.user_id,
      type: "report_reminder",
      entityType: "report",
      entityId: n.entity_id,
      title: "A report is still waiting for you",
      body: n.title,
      url: "/parent",
    });
    count++;
  }
  return count;
}
