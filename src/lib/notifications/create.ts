import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderNotificationEmail } from "@/lib/email/send";
import { sendPushToUser } from "@/lib/notifications/push";
import { EMAIL_PREF_BY_TYPE } from "@/lib/notifications/preferences-server";
import { makeUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import { SITE_URL } from "@/lib/seo/metadata";

export type NotificationType =
  | "booking_confirmed"
  | "new_message"
  | "note_added"
  | "payment_receipt"
  | "verification_update"
  | "meeting_link_ready"
  | "session_reminder"
  | "support_request_new"
  | "support_request_resolved"
  | "report_published"
  | "report_reminder"
  | "session_started"
  | "session_finished"
  | "supervisor_request_new"
  | "supervisor_request_approved"
  | "supervisor_request_denied"
  | "referral_new"
  | "report_needs_approval"
  | "safeguarding_concern_new"
  | "safeguarding_concern_actioned"
  | "home_practice_reminder";

/**
 * P6/E16 from the external PRD review: push payloads previously reused the
 * same title/body as the in-app bell and email, which routinely embed a
 * child's first name ("Zainab's new session report is ready") -- that then
 * sits on a lock screen anyone nearby can read, in a context (child
 * development, therapy) where stigma is a real concern. In-app and email
 * both have a confirmed audience (the logged-in user, or an inbox only they
 * open); a lock screen doesn't. Push gets a generic, category-level label
 * instead; the `url` still deep-links to the specific thing once opened.
 */
const PUSH_GENERIC_TITLE: Record<NotificationType, string> = {
  booking_confirmed: "Booking update",
  new_message: "New message",
  note_added: "New update",
  payment_receipt: "Payment update",
  verification_update: "Verification update",
  meeting_link_ready: "Session update",
  session_reminder: "Upcoming session",
  support_request_new: "Support update",
  support_request_resolved: "Support update",
  report_published: "New report available",
  report_reminder: "A report is waiting for you",
  session_started: "Session update",
  session_finished: "Session update",
  supervisor_request_new: "Supervisor request update",
  supervisor_request_approved: "Supervisor request update",
  supervisor_request_denied: "Supervisor request update",
  referral_new: "New referral",
  report_needs_approval: "A report needs your approval",
  safeguarding_concern_new: "Safeguarding update",
  safeguarding_concern_actioned: "Safeguarding update",
  home_practice_reminder: "Home practice",
};
const PUSH_GENERIC_BODY = "Open Hayven to see what's new.";

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
  /** Where a tap on the push notification, or a click on the in-app bell row, should navigate to. Stored on the row so the bell can deep-link it; also used for the push payload. Falls back to a non-clickable row when omitted. */
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
      url: params.url ?? null,
    });
    if (error) console.error("notification insert failed", params.type, error.message);
  } catch (err) {
    console.error("notification insert threw", params.type, err);
  }

  // Non-transactional types can be muted per-user; a missing preferences
  // row (or a pre-0069 database) means "opted in".
  const prefKey = EMAIL_PREF_BY_TYPE[params.type];
  let optedIn = true;
  if (prefKey) {
    try {
      const { data: pref } = await admin
        .from("notification_preferences")
        .select(prefKey)
        .eq("user_id", params.userId)
        .maybeSingle();
      if (pref && (pref as Record<string, boolean>)[prefKey] === false) optedIn = false;
    } catch {
      // table not migrated yet -> treat as opted in
    }
  }

  if (optedIn) {
    try {
      const { data: user } = await admin.from("users").select("email").eq("id", params.userId).maybeSingle();
      if (user?.email) {
        const unsubscribeUrl = prefKey
          ? `${SITE_URL}/unsubscribe?t=${encodeURIComponent(makeUnsubscribeToken(params.userId))}`
          : undefined;
        await sendEmail({
          to: user.email,
          subject: params.title,
          html: renderNotificationEmail(params.title, params.body, {
            unsubscribeUrl,
            actionUrl: params.url ? `${SITE_URL}${params.url}` : undefined,
          }),
        });
      }
    } catch (err) {
      console.error("notification email threw", params.type, err);
    }
  }

  // Push has its own opt-in (a device subscription created via the "Turn on"
  // toggle) and sendPushToUser already no-ops when there's no subscription
  // -- it doesn't need or want the email preference gate above. Nesting it
  // inside `if (optedIn)` meant turning off an *email* preference (e.g.
  // "email_messages") silently stopped push too, even for a user who never
  // touched the push toggle and has an active subscription. Runs
  // unconditionally so it's reached even for notification types with no
  // email preference at all (prefKey undefined).
  try {
    await sendPushToUser(params.userId, {
      title: PUSH_GENERIC_TITLE[params.type],
      body: PUSH_GENERIC_BODY,
      url: params.url,
    });
  } catch (err) {
    console.error("notification push threw", params.type, err);
  }
}
