import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const CLINICAL_RETENTION_MS = 6 * 365 * 24 * 60 * 60 * 1000; // ~6 years
const ANONYMIZED_NAME = "Deleted child";
// date_of_birth is NOT NULL with no default -- a fixed sentinel in the past
// marks "anonymized" unambiguously (no real Hayven user could have this
// literal value) while satisfying the constraint. Age-based logic reading a
// purged child's DOB after this point is meaningless anyway -- there's no
// clinical content left to contextualize it.
const ANONYMIZED_DOB = "1900-01-01";

/**
 * E3 follow-up, external PRD review. Privacy Policy Section 6 (/privacy),
 * after the clarification resolving what "clinical records" covers:
 * "session notes, reports, goals, behaviour data, and the child's core
 * identifying details recorded as part of their care" are kept up to 6
 * years after the child's last recorded session, even past account
 * deletion -- then purged.
 *
 * Two clinical-record systems coexist in this schema (migration 0010's own
 * comment: the older session_notes/progress_goals flow was left "untouched"
 * when therapy_sessions/goals/reports were added) -- both are purged here.
 * session_notes has no child_id column of its own (only booking_id), so it's
 * reached via this child's bookings.
 *
 * Deleting therapy_sessions cascades to session_behaviour_entries,
 * session_skill_entries, session_goal_progress, session_reinforcers, and
 * reports (all `on delete cascade` from therapy_sessions.id, migration
 * 0010) -- none of those need their own explicit delete.
 *
 * Never touches bookings or payments: bookings.child_id has no cascade
 * (migration 0001), and payments purge independently on their own 6-year
 * clock from the transaction date (src/lib/payments/retention.ts) -- per
 * the same policy clarification, the two timelines can diverge and must
 * not be coupled. therapist_child_assignments (who was ever assigned to
 * this child) is also left alone -- a service-history/business record, not
 * clinical content the policy names.
 *
 * Anonymizes the children row in place rather than deleting it, for the
 * same referential-integrity reason src/lib/account/purge.ts anonymizes
 * users instead of deleting it: bookings.child_id (no cascade) would block
 * an actual delete, and a booking tied to this child must be able to
 * survive independently on its own payment-retention clock.
 */
export async function purgeChildClinicalRecords(childId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: child } = await admin.from("children").select("id, first_name").eq("id", childId).maybeSingle();
  if (!child) return;
  if (child.first_name === ANONYMIZED_NAME) return; // already purged -- idempotent no-op

  const { data: bookings } = await admin.from("bookings").select("id").eq("child_id", childId);
  const bookingIds = (bookings ?? []).map((b) => b.id);
  if (bookingIds.length > 0) {
    await admin.from("session_notes").delete().in("booking_id", bookingIds);
  }

  await admin.from("progress_goals").delete().eq("child_id", childId);
  await admin.from("goals").delete().eq("child_id", childId);
  await admin.from("target_behaviours").delete().eq("child_id", childId);
  await admin.from("skills").delete().eq("child_id", childId);
  await admin.from("child_diagnoses").delete().eq("child_id", childId);
  await admin.from("intake_forms").delete().eq("child_id", childId);
  await admin.from("intake_consents").delete().eq("child_id", childId);
  await admin.from("therapy_sessions").delete().eq("child_id", childId); // cascades: see comment above

  await admin
    .from("children")
    .update({ first_name: ANONYMIZED_NAME, presenting_concern: null, date_of_birth: ANONYMIZED_DOB })
    .eq("id", childId);
}

/**
 * A child's "last recorded session" has to account for both clinical
 * systems: therapy_sessions.session_date (the current system) and, for the
 * older booking-linked flow, the latest completed booking's slot end_time
 * (session_notes itself carries no date of the session, only created_at --
 * when the note was written, not necessarily when the session happened).
 * Returns null when neither system has anything for this child -- no
 * anchor, not eligible for this purge (there's no "last session" to be 6
 * years past).
 */
async function getLastSessionDate(admin: Admin, childId: string): Promise<Date | null> {
  const { data: latestSession } = await admin
    .from("therapy_sessions")
    .select("session_date")
    .eq("child_id", childId)
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: completedBookings } = await admin
    .from("bookings")
    .select("availability_slots(end_time)")
    .eq("child_id", childId)
    .eq("status", "completed");

  let latestBookingEnd: Date | null = null;
  for (const booking of completedBookings ?? []) {
    const end = (booking.availability_slots as unknown as { end_time: string } | null)?.end_time;
    if (!end) continue;
    const endDate = new Date(end);
    if (!latestBookingEnd || endDate > latestBookingEnd) latestBookingEnd = endDate;
  }

  const candidates = [
    latestSession?.session_date ? new Date(latestSession.session_date) : null,
    latestBookingEnd,
  ].filter((d): d is Date => d !== null);

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, d) => (d > latest ? d : latest));
}

/**
 * Sweeps every child not yet purged and purges the ones whose last recorded
 * session (across both clinical systems) is 6+ years old. One query per
 * child (getLastSessionDate) -- fine at pilot-stage volume; would need
 * batching if the platform's child count grows large, same caveat already
 * noted on searchDiscoveryTherapists (src/lib/therapist/discovery.ts).
 */
export async function purgeAgedOutClinicalRecords(): Promise<{ purged: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CLINICAL_RETENTION_MS);

  const { data: children } = await admin.from("children").select("id, first_name").neq("first_name", ANONYMIZED_NAME);

  let purged = 0;
  for (const child of children ?? []) {
    const lastSession = await getLastSessionDate(admin, child.id);
    if (!lastSession || lastSession >= cutoff) continue;
    try {
      await purgeChildClinicalRecords(child.id);
      purged += 1;
    } catch (err) {
      console.error("purgeAgedOutClinicalRecords: failed for child", child.id, err);
    }
  }

  return { purged };
}
