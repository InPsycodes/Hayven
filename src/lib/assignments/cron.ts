import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const INACTIVITY_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * E5, external PRD review: therapist_child_assignments.ended_on existed but
 * was write-only -- the only way an assignment ever ended was a human admin
 * or supervisor manually clicking "end." Nothing lapsed a stale assignment
 * on its own, unlike every other time-bound access/data window in this
 * schema (booking holds, account/clinical/payment retention). A departed or
 * long-inactive therapist kept full standing access to a child's clinical
 * records indefinitely.
 *
 * 90 days with no recorded clinical session or documented clinical
 * activity for this specific (therapist, child) pair auto-expires the
 * assignment. Deliberately NOT based on the therapist's login activity --
 * logging into Hayven doesn't demonstrate an active clinical relationship
 * with any particular child.
 *
 * is_assigned_therapist() (migration 0086) already requires status =
 * 'active' -- flipping to 'expired' cuts off read/write access immediately
 * and completely, no RLS changes needed. Consent revocation (0086) is a
 * fully separate, already-independent check on top of that, so it remains
 * an immediate cutoff regardless of this 90-day window either way.
 *
 * Scheduled daily via src/app/api/cron/retention (reusing that route's
 * infra rather than adding a fourth cron/pg_cron pair -- this shares its
 * "not time-critical, daily is plenty" cadence even though it's an access-
 * lifecycle concern, not a data-retention one).
 */
export async function expireInactiveAssignments(): Promise<{ expired: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_MS);

  const { data: assignments } = await admin
    .from("therapist_child_assignments")
    .select("id, therapist_id, child_id, started_on")
    .eq("status", "active");

  let expired = 0;
  for (const assignment of assignments ?? []) {
    const lastActivity = await getLastActivityDate(
      admin,
      assignment.therapist_id,
      assignment.child_id,
      new Date(assignment.started_on)
    );
    if (lastActivity >= cutoff) continue;

    const { error } = await admin
      .from("therapist_child_assignments")
      .update({
        status: "expired",
        ended_on: new Date().toISOString().slice(0, 10),
        ended_reason: "inactivity",
      })
      .eq("id", assignment.id)
      .eq("status", "active"); // don't clobber one an admin/supervisor already ended manually in the meantime
    if (error) {
      console.error("expireInactiveAssignments: failed for assignment", assignment.id, error.message);
      continue;
    }
    expired += 1;
  }

  return { expired };
}

/**
 * The later of: this (therapist, child) pair's most recent therapy_sessions
 * row (the current clinical system), their most recently documented
 * session_notes entry (the older, booking-linked system -- no child_id
 * column of its own, reached via this pair's bookings), or the assignment's
 * own started_on (so a brand-new assignment with zero activity yet still
 * has a real anchor to measure 90 days from, instead of never expiring
 * just because nothing has happened).
 */
async function getLastActivityDate(admin: Admin, therapistId: string, childId: string, startedOn: Date): Promise<Date> {
  const { data: latestSession } = await admin
    .from("therapy_sessions")
    .select("session_date")
    .eq("child_id", childId)
    .eq("therapist_id", therapistId)
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: bookings } = await admin
    .from("bookings")
    .select("id")
    .eq("child_id", childId)
    .eq("therapist_id", therapistId);
  const bookingIds = (bookings ?? []).map((b) => b.id);

  let latestNoteAt: Date | null = null;
  if (bookingIds.length > 0) {
    const { data: note } = await admin
      .from("session_notes")
      .select("created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (note?.created_at) latestNoteAt = new Date(note.created_at);
  }

  const candidates = [
    latestSession?.session_date ? new Date(latestSession.session_date) : null,
    latestNoteAt,
    startedOn,
  ].filter((d): d is Date => d !== null);

  return candidates.reduce((latest, d) => (d > latest ? d : latest));
}
