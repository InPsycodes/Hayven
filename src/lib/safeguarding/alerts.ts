import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { logAuditEvent } from "@/lib/audit/log";
import { detectSafeguardingPhrases, reportBodyText, extractDomainFreeText } from "@/lib/reports/safety";
import type { AppSession } from "@/lib/auth/session";
import { getSafeguardingLeadIds } from "./leads";

/**
 * Notifies the safeguarding leads that a concern needs them. Deliberately
 * generic -- no child name, no detail: the email lands in an inbox and the
 * push on a lock screen. The detail is one click away, behind the admin
 * login.
 */
export async function notifySafeguardingLeads(concernId: string, immediateDanger: boolean): Promise<void> {
  const { ids } = await getSafeguardingLeadIds();
  for (const userId of ids) {
    await createNotification({
      userId,
      type: "safeguarding_concern_new",
      entityType: "safeguarding_concern",
      entityId: concernId,
      title: immediateDanger ? "URGENT: a safeguarding concern needs you now" : "A new safeguarding concern needs review",
      body: immediateDanger
        ? "Someone has reported a child may be in immediate danger. Open Hayven now. If you can't act, the Deputy DSL must be contacted."
        : "A safeguarding concern has been logged. Open Hayven to review it and record your decision.",
      url: `/admin/safeguarding/${concernId}`,
    });
  }
}

/**
 * Procedure §9: a published report whose session contains safety-related
 * wording reaches the DSL automatically, rather than relying on the
 * therapist to raise it. Called after both publish paths (publishReport
 * and approveAndPublishReport) have succeeded.
 *
 * Scans every free-text field of the session -- including the confidential
 * note, which is exactly where the pre-publish warning tells a therapist to
 * move a concern, so a concern taken out of the parent report still
 * reaches the DSL.
 *
 * Fire-and-forget: never throws, never affects the publish.
 */
export async function flagPublishedReportForSafeguarding(params: {
  actor: AppSession;
  reportId: string;
  childId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: report } = await admin
      .from("reports")
      .select("session_id, therapist_body, parent_body")
      .eq("id", params.reportId)
      .maybeSingle();
    if (!report?.session_id) return;

    const { data: session } = await admin
      .from("therapy_sessions")
      .select("id, therapist_notes, general_presentation, confidential_note")
      .eq("id", report.session_id)
      .maybeSingle();
    if (!session) return;

    const { data: skillEntries } = await admin
      .from("session_skill_entries")
      .select("structured_data, skills(domain_type)")
      .eq("session_id", session.id);
    const domainFreeText = (skillEntries ?? []).flatMap((entry) => {
      const domainType = (entry.skills as unknown as { domain_type: string | null } | null)?.domain_type ?? null;
      return extractDomainFreeText(domainType, entry.structured_data as Record<string, unknown> | null);
    });

    const matched = [
      ...new Set(
        [
          session.therapist_notes,
          session.general_presentation,
          session.confidential_note,
          ...domainFreeText,
          // Both report versions can be edited by hand after generation.
          reportBodyText(report.therapist_body),
          reportBodyText(report.parent_body),
        ].flatMap(
          (text) => detectSafeguardingPhrases(text)
        )
      ),
    ];
    if (matched.length === 0) return;

    // One auto-flag per session (unique partial index in 0104) -- a report
    // edited and republished doesn't page the DSL twice.
    const { data: concern, error } = await admin
      .from("safeguarding_concerns")
      .insert({
        source: "auto_flag",
        child_id: params.childId,
        therapy_session_id: session.id,
        report_id: params.reportId,
        description: `Automatic flag: the session behind a just-published report contains safety-related wording (${matched.join(", ")}). Read the session notes and confidential note, then record a decision.`,
        matched_phrases: matched,
      })
      .select("id")
      .single();
    if (error || !concern) {
      if (error && error.code !== "23505") console.error("safeguarding auto-flag insert failed", error.message);
      return;
    }

    await admin.from("safeguarding_concern_events").insert({
      concern_id: concern.id,
      actor_id: params.actor.userId,
      kind: "auto_flagged",
      note: `Flagged on report publish. Matched: ${matched.join(", ")}.`,
    });
    // No childId on the shared audit log -- /admin/audit-log is visible to
    // every admin, and "a safeguarding flag exists for child X" is itself
    // the sensitive fact. The concern id is enough to trace it.
    await logAuditEvent({
      actor: params.actor,
      action: "safeguarding_concern.auto_flag",
      entityType: "safeguarding_concern",
      entityId: concern.id,
    });
    await notifySafeguardingLeads(concern.id, false);
  } catch (err) {
    console.error("safeguarding auto-flag threw", params.reportId, err);
  }
}
