"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { notifyParentReportPublished } from "@/lib/reports/actions";
import { captureServer } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

/** Defense in depth -- real enforcement is the RLS policy from 0024 (is_supervisor_of_therapist), this just gives a friendly error instead of a silent no-op. */
async function isOwnTeamTherapist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supervisorId: string,
  therapistId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("supervisor_assignments")
    .select("id")
    .eq("supervisor_id", supervisorId)
    .eq("therapist_id", therapistId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export async function assignChildToTherapist(
  therapistId: string,
  childId: string,
  therapyType?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = await createClient();
  if (!(await isOwnTeamTherapist(supabase, session.userId, therapistId))) {
    return { ok: false, error: "That therapist isn't on your team." };
  }

  // Defense in depth -- real enforcement is the RLS policy from 0034: a
  // supervisor can only add a team therapist to a child who's already an
  // established Hayven client (has a confirmed/completed booking with
  // someone), not an arbitrary child on the platform.
  const { data: existingClient } = await supabase
    .from("bookings")
    .select("id")
    .eq("child_id", childId)
    .in("status", ["confirmed", "completed"])
    .limit(1)
    .maybeSingle();
  if (!existingClient) {
    return { ok: false, error: "This child doesn't have a confirmed booking yet. Ask an admin to set up the first assignment." };
  }

  const { error } = await supabase.from("therapist_child_assignments").insert({
    therapist_id: therapistId,
    child_id: childId,
    therapy_type: therapyType && therapyType.trim() ? therapyType.trim() : null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This therapist is already assigned to this child." };
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.create",
    entityType: "therapist_child_assignment",
    childId,
    metadata: { therapistId },
  });

  revalidatePath("/supervisor/assignments");
  return { ok: true };
}

export async function endTherapistChildAssignmentAsSupervisor(
  assignmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("therapist_child_assignments")
    .select("therapist_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!existing || !(await isOwnTeamTherapist(supabase, session.userId, existing.therapist_id))) {
    return { ok: false, error: "Assignment not found." };
  }

  const { data, error } = await supabase
    .from("therapist_child_assignments")
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10), ended_reason: "manual" })
    .eq("id", assignmentId)
    .select("id, child_id, therapist_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Assignment not found." };

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.end",
    entityType: "therapist_child_assignment",
    entityId: assignmentId,
    childId: data.child_id,
    metadata: { therapistId: data.therapist_id },
  });

  revalidatePath("/supervisor/assignments");
  return { ok: true };
}

/**
 * E5, external PRD review: same reasoning as renewTherapistChildAssignment
 * (src/lib/admin/actions.ts) -- creates a fresh row rather than reactivating
 * the lapsed one, so the old row stays an untouched record of when and why
 * access previously ended. Scoped to the supervisor's own team the same way
 * every other action in this file is (isOwnTeamTherapist), via the
 * RLS-bound client rather than the service-role one.
 */
export async function renewTherapistChildAssignmentAsSupervisor(
  assignmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("therapist_child_assignments")
    .select("therapist_id, child_id, therapy_type, status")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!existing || !(await isOwnTeamTherapist(supabase, session.userId, existing.therapist_id))) {
    return { ok: false, error: "Assignment not found." };
  }
  if (existing.status === "active") return { ok: false, error: "This assignment is already active." };

  const { data, error } = await supabase
    .from("therapist_child_assignments")
    .insert({ therapist_id: existing.therapist_id, child_id: existing.child_id, therapy_type: existing.therapy_type })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This therapist is already actively assigned to this child." };
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.renew",
    entityType: "therapist_child_assignment",
    entityId: data.id,
    childId: existing.child_id,
    metadata: { therapistId: existing.therapist_id, previousAssignmentId: assignmentId },
  });

  revalidatePath("/supervisor/assignments");
  return { ok: true };
}

/**
 * E10/D5, external PRD review: the only thing that can set published_at for
 * a report from a therapist who has an active supervisor -- publishReport
 * (src/lib/reports/actions.ts) routes those therapists here instead of
 * publishing directly. Scoped to the supervisor's own team the same way
 * every other action in this file is (isOwnTeamTherapist).
 */
export async function approveAndPublishReport(reportId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = await createClient();

  const { data: report } = await supabase.from("reports").select("id, session_id").eq("id", reportId).maybeSingle();
  if (!report) return { ok: false, error: "Report not found." };

  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select("child_id, therapist_id")
    .eq("id", report.session_id)
    .maybeSingle();
  if (!therapySession || !(await isOwnTeamTherapist(supabase, session.userId, therapySession.therapist_id))) {
    return { ok: false, error: "Report not found." };
  }

  const { data, error } = await supabase
    .from("reports")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("status", "in_review")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This report isn't waiting for approval." };

  await logAuditEvent({
    actor: session,
    action: "report.approve_and_publish",
    entityType: "report",
    entityId: reportId,
    childId: therapySession.child_id,
  });

  await captureServer(session.userId, ANALYTICS_EVENTS.reportPublished, { role: "supervisor" });

  // RLS-01, pre-launch audit: a supervisor's RLS visibility into a
  // supervised therapist's users row is now name-only via a dedicated
  // roster view (0098), not the raw table -- but ownership of this
  // specific therapist is already verified by isOwnTeamTherapist above, so
  // the admin client is simplest and consistent with notifyParentReportPublished
  // just below.
  const admin = createAdminClient();
  const { data: therapistProfile } = await admin
    .from("therapist_profiles")
    .select("users(full_name)")
    .eq("id", therapySession.therapist_id)
    .maybeSingle();
  const therapistName =
    (therapistProfile?.users as unknown as { full_name: string } | null)?.full_name ?? "Your therapist";
  await notifyParentReportPublished(admin, therapySession.child_id, reportId, therapistName);

  revalidatePath(`/supervisor/children/${therapySession.child_id}/sessions/${report.session_id}`);
  return { ok: true };
}
