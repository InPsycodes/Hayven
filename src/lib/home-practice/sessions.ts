import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_ACTIVITIES, MAX_ACTIVITY_LENGTH } from "./types";

/** The non-empty home-practice lines from the session form, trimmed, at most three. */
export function homePracticeLines(values: unknown[]): string[] {
  return values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .slice(0, MAX_ACTIVITIES);
}

export function homePracticeLinesError(lines: string[]): string | null {
  return lines.some((l) => l.length > MAX_ACTIVITY_LENGTH)
    ? `Keep each home activity under ${MAX_ACTIVITY_LENGTH} characters.`
    : null;
}

/**
 * Called once a session is saved. The caller (createTherapySession) has
 * already checked the therapist is assigned to the child.
 *
 * This therapist's earlier activities for the child are closed unless they
 * chose "Keep it", which carries an activity over (once: the choice resets,
 * so it's asked again next time). Other care-team therapists' activities
 * are never touched. Then the new lines are added.
 *
 * Never throws: a failure here must not lose the session that was just saved.
 */
export async function replaceHomePracticeForSession(params: {
  childId: string;
  therapistProfileId: string;
  sessionId: string;
  sessionDate: string;
  lines: string[];
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    await admin
      .from("home_practice_activities")
      .update({ status: "replaced", closed_at: now })
      .eq("child_id", params.childId)
      .eq("therapist_id", params.therapistProfileId)
      .eq("status", "active")
      .or("next_step.is.null,next_step.eq.change");

    await admin
      .from("home_practice_activities")
      .update({ next_step: null })
      .eq("child_id", params.childId)
      .eq("therapist_id", params.therapistProfileId)
      .eq("status", "active")
      .eq("next_step", "keep");

    if (params.lines.length === 0) return;
    const { error } = await admin.from("home_practice_activities").insert(
      params.lines.map((body, i) => ({
        child_id: params.childId,
        therapist_id: params.therapistProfileId,
        therapy_session_id: params.sessionId,
        set_on: params.sessionDate,
        body,
        position: i + 1,
      }))
    );
    if (error) console.error("home practice insert failed", params.sessionId, error.message);
  } catch (err) {
    console.error("home practice update threw", params.sessionId, err);
  }
}
