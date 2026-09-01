import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSession } from "@/lib/auth/session";

export type AuditAction =
  | "session_note.create"
  | "goal.create"
  | "goal.update_status"
  | "target_behaviour.create"
  | "target_behaviour.toggle_active"
  | "skill.create"
  | "skill.toggle_active"
  | "report.generate"
  | "report.save"
  | "report.publish"
  | "verification.decide"
  | "assignment.therapist_child.create"
  | "assignment.therapist_child.end"
  | "assignment.supervisor_therapist.create"
  | "assignment.supervisor_therapist.end"
  | "account_deletion_request.submit"
  | "account_deletion_request.review"
  | "booking.cancel"
  | "booking.reschedule"
  | "booking.no_show"
  | "booking.no_show_undo"
  | "booking.set_meeting_link"
  | "payment.mark_refunded"
  | "report_phrase.add"
  | "report_phrase.delete"
  | "support_request.submit"
  | "support_request.resolve"
  | "account.suspend"
  | "account.reactivate"
  | "account.reset_password"
  | "account.grant_supervisor"
  | "account.revoke_supervisor"
  | "supervisor_request.submit"
  | "supervisor_request.approved"
  | "supervisor_request.denied"
  | "learning_article.create"
  | "learning_article.update"
  | "learning_article.publish"
  | "learning_article.unpublish"
  | "learning_article.delete"
  | "learning_category.create"
  | "learning_category.delete"
  | "intake_form.save"
  | "learning_course.create"
  | "learning_course.update"
  | "learning_course.publish"
  | "learning_course.unpublish"
  | "learning_course.delete"
  | "learning_lesson.create"
  | "learning_lesson.update"
  | "learning_lesson.delete"
  | "review.submit"
  | "review.delete";

/**
 * Fire-and-forget: a logging failure must never roll back a clinical write
 * that already succeeded. audit_log has no `authenticated` grant at all, so
 * this always goes through the service-role client.
 */
export async function logAuditEvent(params: {
  actor: AppSession;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  childId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_id: params.actor.userId,
      actor_role: params.actor.role,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      child_id: params.childId ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) console.error("audit log insert failed", params.action, error.message);
  } catch (err) {
    console.error("audit log insert threw", params.action, err);
  }
}
