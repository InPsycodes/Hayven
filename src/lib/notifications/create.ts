import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderNotificationEmail } from "@/lib/email/send";
import { sendPushToUser } from "@/lib/notifications/push";

export type NotificationType =
  | "booking_confirmed"
  | "new_message"
  | "note_added"
  | "payment_receipt"
  | "verification_update"
  | "meeting_link_ready"
  | "support_request_new"
  | "support_request_resolved"
  | "report_published"
  | "report_reminder"
  | "session_started"
  | "session_finished"
  | "supervisor_request_new"
  | "supervisor_request_approved"
  | "supervisor_request_denied";

/**
 * Fire-and-forget: a notification failing to write must never roll back the
 * booking/message/note/decision that triggered it. notifications' RLS only
 * lets a user manage their own rows, so cross-user delivery always needs the
 * service-role client -- same shape as logAuditEvent.
 *
 * The in-app row is the one that must never silently fail -- it's queried
 * back by the notification bell. The email is a best-effort echo of the
 * same title/body sent alongside it, in its own try/catch so a Resend
 * outage can never affect the notification actually landing in-app.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Lets a later dedup check ask "does a notification of this type already exist for this entity" -- e.g. entityType: "report", entityId: reportId. Optional: existing notification types don't set these. */
  entityType?: string;
  entityId?: string;
  /** Where a tap on the push notification (or a click in the in-app bell, if the UI ever wires that up) should navigate to. Defaults to the dashboard root. */
  url?: string;
}): Promise<void> {
  const admin = createAdminClient();
  try {
    const { error } = await admin.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
    });
    if (error) console.error("notification insert failed", params.type, error.message);
  } catch (err) {
    console.error("notification insert threw", params.type, err);
  }

  try {
    const { data: user } = await admin.from("users").select("email").eq("id", params.userId).maybeSingle();
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: params.title,
        html: renderNotificationEmail(params.title, params.body),
      });
    }
  } catch (err) {
    console.error("notification email threw", params.type, err);
  }

  try {
    await sendPushToUser(params.userId, { title: params.title, body: params.body, url: params.url });
  } catch (err) {
    console.error("notification push threw", params.type, err);
  }
}
