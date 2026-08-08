import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * confidential_note is select-revoked from `authenticated` entirely
 * (0011_progress_reports_rls.sql) -- RLS can't restrict columns, so this is
 * the only read path, same pattern as getReportForSession. Any therapist
 * currently assigned to the child can read it, not just whoever wrote it --
 * that's the point of a safeguarding note: the whole care team should be
 * able to see a flagged concern, not just its author.
 */
export async function getConfidentialNote(sessionId: string, therapistId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: therapySession } = await admin
    .from("therapy_sessions")
    .select("id, child_id, confidential_note")
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession) return null;

  const { data: assignment } = await admin
    .from("therapist_child_assignments")
    .select("id")
    .eq("child_id", therapySession.child_id)
    .eq("therapist_id", therapistId)
    .eq("status", "active")
    .maybeSingle();
  if (!assignment) return null;

  return therapySession.confidential_note;
}
