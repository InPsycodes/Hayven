import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { recordSessionEarnings } from "@/lib/payouts/earnings";
import { formatDateTime, formatTime } from "@/data/format";

type BookingRow = {
  id: string;
  parent_id: string;
  children: { first_name: string } | null;
  availability_slots: { start_time: string; end_time: string } | null;
  therapist_profiles: { user_id: string; users: { full_name: string } | null } | null;
};

const REMINDER_SELECT =
  "id, parent_id, children(first_name), availability_slots(start_time, end_time), therapist_profiles(user_id, users(full_name))";

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
    .select(REMINDER_SELECT)
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
    .select(REMINDER_SELECT)
    .eq("status", "confirmed");
  const data = raw as unknown as BookingRow[] | null;
  if (!data) return 0;

  const nowMs = Date.now();
  const finished = data.filter((b) => b.availability_slots && new Date(b.availability_slots.end_time).getTime() <= nowMs);
  if (finished.length === 0) return 0;

  const { data: nowCompleted } = await admin
    .from("bookings")
    .update({ status: "completed" })
    .in("id", finished.map((b) => b.id))
    .eq("status", "confirmed")
    .select("id");
  await recordSessionEarnings(admin, (nowCompleted ?? []).map((b) => b.id));

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

const HOUR_MS = 60 * 60 * 1000;

/** Booking ids that already got this reminder variant (dedup by entity_type marker). */
async function alreadyRemindedIds(
  admin: ReturnType<typeof createAdminClient>,
  marker: string,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await admin
    .from("notifications")
    .select("entity_id")
    .eq("type", "session_reminder")
    .eq("entity_type", marker)
    .in("entity_id", ids);
  return new Set((data ?? []).map((r) => r.entity_id as string));
}

/**
 * Pre-session reminders for confirmed bookings: one "coming up" a day out
 * (or sooner, if it was booked late) and one "starts soon" shortly before.
 * Windows are wide enough (upper bounds well past the 15-min cron interval)
 * to survive a delayed or skipped cron run; the dedup markers keep each
 * variant to once per booking.
 */
export async function notifyUpcomingSessions(): Promise<number> {
  const admin = createAdminClient();
  const { data: raw } = await admin.from("bookings").select(REMINDER_SELECT).eq("status", "confirmed");
  const data = raw as unknown as BookingRow[] | null;
  if (!data) return 0;

  const now = Date.now();
  const timed = data
    .filter((b) => b.availability_slots)
    .map((b) => ({ b, ms: new Date(b.availability_slots!.start_time).getTime() - now }));

  const dayBefore = timed.filter(({ ms }) => ms > 75 * 60 * 1000 && ms <= 25 * HOUR_MS).map(({ b }) => b);
  const soon = timed.filter(({ ms }) => ms > 0 && ms <= 75 * 60 * 1000).map(({ b }) => b);

  const [skipDay, skipSoon, skipSoonT] = await Promise.all([
    alreadyRemindedIds(admin, "booking_reminder_day", dayBefore.map((b) => b.id)),
    alreadyRemindedIds(admin, "booking_reminder_soon", soon.map((b) => b.id)),
    alreadyRemindedIds(admin, "booking_reminder_soon_therapist", soon.map((b) => b.id)),
  ]);

  let count = 0;

  for (const b of dayBefore) {
    if (skipDay.has(b.id)) continue;
    const child = b.children?.first_name ?? "Your child";
    const therapist = b.therapist_profiles?.users?.full_name ?? "their therapist";
    await createNotification({
      userId: b.parent_id,
      type: "session_reminder",
      entityType: "booking_reminder_day",
      entityId: b.id,
      title: `Session coming up: ${child}`,
      body: `${child}'s session with ${therapist} is ${formatDateTime(b.availability_slots!.start_time)}.`,
      url: "/parent/sessions",
    });
    count++;
  }

  for (const b of soon) {
    const child = b.children?.first_name ?? "Your child";
    const therapist = b.therapist_profiles?.users?.full_name ?? "their therapist";
    const when = formatTime(b.availability_slots!.start_time);

    if (!skipSoon.has(b.id)) {
      await createNotification({
        userId: b.parent_id,
        type: "session_reminder",
        entityType: "booking_reminder_soon",
        entityId: b.id,
        title: `${child}'s session starts soon`,
        body: `${child}'s session with ${therapist} starts at ${when}.`,
        url: "/parent/sessions",
      });
      count++;
    }

    const therapistUserId = b.therapist_profiles?.user_id;
    if (therapistUserId && !skipSoonT.has(b.id)) {
      await createNotification({
        userId: therapistUserId,
        type: "session_reminder",
        entityType: "booking_reminder_soon_therapist",
        entityId: b.id,
        title: `Session starts soon: ${child}`,
        body: `Your session with ${child} starts at ${when}.`,
        url: "/therapist/schedule",
      });
    }
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
