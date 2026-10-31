"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { captureServer } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getGenerationInput, getPhraseVariants } from "./queries";
import { generateParentReport, generateTherapistReport } from "./generate";
import type { ReportBody } from "./types";
import { flagPublishedReportForSafeguarding } from "@/lib/safeguarding/alerts";
import { notifyParentReportPublished } from "./notify";

/** Defense in depth -- RLS already blocks a cross-tenant write, but every other action in this file re-checks ownership explicitly, and these two should too. Returns the report's child_id when owned (also handy for audit logging), or null. */
async function reportBelongsToTherapist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  therapistId: string
): Promise<string | null> {
  const { data: report } = await supabase.from("reports").select("session_id").eq("id", reportId).maybeSingle();
  if (!report) return null;
  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select("child_id")
    .eq("id", report.session_id)
    .eq("therapist_id", therapistId)
    .maybeSingle();
  return therapySession?.child_id ?? null;
}

export async function generateReport(
  sessionId: string,
  toneOverride?: "warm" | "direct"
): Promise<{ ok: true; reportId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "You must be signed in as a therapist." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) {
    return { ok: false, error: "Finish setting up your profile first." };
  }

  const supabase = await createClient();

  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select("id, therapist_id, child_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession || therapySession.therapist_id !== therapist.id) {
    return { ok: false, error: "Session not found." };
  }

  // Don't spawn duplicate reports for the same session -- if one already
  // exists, just hand back its id.
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return { ok: true, reportId: existing.id };

  const input = await getGenerationInput(sessionId);
  if (!input) return { ok: false, error: "Couldn't load session data." };

  const tone = toneOverride ?? therapist.reportTone;
  const extra = await getPhraseVariants(tone);

  const startedAt = Date.now();
  let therapistBody, parentBody;
  try {
    therapistBody = generateTherapistReport(input);
    parentBody = generateParentReport(input, { tone, extra });
  } catch (err) {
    console.error("report generation threw", sessionId, err);
    return { ok: false, error: "Couldn't generate the report from this session's data. Please try again." };
  }
  const generationMs = Date.now() - startedAt;

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      session_id: sessionId,
      status: "draft",
      therapist_body: therapistBody,
      parent_body: parentBody,
      model_version: "rule-based-v1",
      generation_ms: generationMs,
      input_snapshot: input,
      requested_by: session.userId,
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !report) {
    return { ok: false, error: error?.message ?? "Couldn't save the generated report." };
  }

  await logAuditEvent({
    actor: session,
    action: "report.generate",
    entityType: "report",
    entityId: report.id,
    childId: therapySession.child_id,
  });

  revalidatePath(`/therapist/children`);
  return { ok: true, reportId: report.id };
}

export async function saveReport(
  reportId: string,
  therapistBody: ReportBody
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "Not authorized." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const childId = await reportBelongsToTherapist(supabase, reportId, therapist.id);
  if (!childId) {
    return { ok: false, error: "Report not found." };
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ therapist_body: therapistBody })
    .eq("id", reportId)
    .select("id, published_at")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Report not found." };

  // Editing a report that's already been shown to a parent doesn't change
  // what the parent sees (parent_body is independent), but it does mean the
  // parent's copy may no longer match the therapist's latest thinking --
  // flag it for a deliberate re-publish rather than silently drifting.
  if (data.published_at) {
    await supabase.from("reports").update({ status: "in_review" }).eq("id", reportId);
  }

  await logAuditEvent({ actor: session, action: "report.save", entityType: "report", entityId: reportId, childId });

  revalidatePath(`/therapist/children`);
  return { ok: true };
}

/**
 * Saves the therapist's edits to the parent version. Allowed until the
 * report is published: the parent reads parent_body directly, so an edit
 * after publishing would change a report they have already been sent (and,
 * for a supervised therapist, skip the supervisor's approval). While it is
 * awaiting approval it can still be edited; the supervisor approves
 * whatever is saved.
 */
export async function saveParentReport(
  reportId: string,
  parentBody: ReportBody
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "Not authorized." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const childId = await reportBelongsToTherapist(supabase, reportId, therapist.id);
  if (!childId) {
    return { ok: false, error: "Report not found." };
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ parent_body: parentBody })
    .eq("id", reportId)
    .is("published_at", null)
    .select("id")
    .maybeSingle();

  // 42501: the column grant from migration 0108 isn't in place.
  if (error?.code === "42501") {
    return { ok: false, error: "Editing the parent version isn't available yet. Please contact Hayven." };
  }
  if (error) return { ok: false, error: error.message };
  if (!data) {
    return { ok: false, error: "This report has already been published to the parent, so their copy can't be changed." };
  }

  await logAuditEvent({ actor: session, action: "report.save_parent", entityType: "report", entityId: reportId, childId });

  revalidatePath(`/therapist/children`);
  return { ok: true };
}

/**
 * Publishes for the first time, or re-publishes after an edit -- either way
 * this is the therapist's explicit sign-off that the parent should see the
 * current state. E10/D5, external PRD review: a therapist with an active
 * supervisor submits for that supervisor's approval instead of publishing
 * directly -- approveAndPublishReport (src/lib/supervisor/actions.ts) is
 * the only thing that can then set published_at for them. An unsupervised
 * therapist (supervision here is elective, not universal -- E9) keeps
 * publishing directly, exactly as before; this never blocks a therapist who
 * has no supervisor to ask.
 */
export async function publishReport(
  reportId: string
): Promise<{ ok: true; pendingApproval?: boolean } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "Not authorized." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const childId = await reportBelongsToTherapist(supabase, reportId, therapist.id);
  if (!childId) {
    return { ok: false, error: "Report not found." };
  }

  // supervisor_assignments' RLS (migration 0024) only lets a supervisor read
  // rows where THEY are supervisor_id, not a therapist checking their own
  // rows as therapist_id -- the RLS-bound client would silently return
  // empty here and this whole gate would never fire. Admin client, same
  // "defense in depth, ownership already established by session" pattern
  // this file already uses throughout (reportBelongsToTherapist etc.).
  const { data: activeSupervisors } = await createAdminClient()
    .from("supervisor_assignments")
    .select("supervisor_id")
    .eq("therapist_id", therapist.id)
    .eq("status", "active");

  if (activeSupervisors && activeSupervisors.length > 0) {
    const { data, error } = await supabase
      .from("reports")
      .update({ status: "in_review" })
      .eq("id", reportId)
      .neq("status", "in_review")
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, pendingApproval: true }; // already submitted, awaiting the same approval -- idempotent no-op

    await logAuditEvent({
      actor: session,
      action: "report.submit_for_approval",
      entityType: "report",
      entityId: reportId,
      childId,
    });

    try {
      const admin = createAdminClient();
      const { data: child } = await admin.from("children").select("first_name").eq("id", childId).maybeSingle();
      const childName = child?.first_name ?? "a child";
      for (const { supervisor_id } of activeSupervisors) {
        await createNotification({
          userId: supervisor_id,
          type: "report_needs_approval",
          entityType: "report",
          entityId: reportId,
          title: "A report needs your approval",
          body: `${session.name} submitted a session report for ${childName} -- review it before it reaches the parent.`,
          url: `/supervisor/children/${childId}`,
        });
      }
    } catch (err) {
      console.error("report_needs_approval notification threw", reportId, err);
    }

    revalidatePath(`/therapist/children`);
    return { ok: true, pendingApproval: true };
  }

  // Conditional on status != 'published' -- editing an already-published
  // report flips status back to 'in_review' (see saveReport above), so a
  // genuine republish always transitions FROM 'in_review'. A second,
  // duplicate call for a report that's already published (a double-click,
  // a network retry) finds nothing to update and safely no-ops instead of
  // re-sending the parent notification below.
  const { data, error } = await supabase
    .from("reports")
    .update({ status: "published", published_at: new Date().toISOString(), approved_by: session.userId, approved_at: new Date().toISOString() })
    .eq("id", reportId)
    .neq("status", "published")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true }; // already published by a prior call -- idempotent no-op

  await logAuditEvent({ actor: session, action: "report.publish", entityType: "report", entityId: reportId, childId });

  await captureServer(session.userId, ANALYTICS_EVENTS.reportPublished, { role: "therapist" });

  // Cross-user delivery (therapist publishing -> parent notified) needs the
  // service-role client, same reasoning as createNotification's own reads --
  // never let a notification failure roll back a publish that already
  // succeeded, so this is fire-and-forget after the real write.
  await notifyParentReportPublished(createAdminClient(), childId, reportId, session.name);
  await flagPublishedReportForSafeguarding({ actor: session, reportId, childId });

  revalidatePath(`/therapist/children`);
  return { ok: true };
}
