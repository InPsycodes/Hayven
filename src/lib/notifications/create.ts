import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "booking_confirmed"
  | "new_message"
  | "note_added"
  | "payment_receipt"
  | "verification_update"
  | "meeting_link_ready";

/**
 * Fire-and-forget: a notification failing to write must never roll back the
 * booking/message/note/decision that triggered it. notifications' RLS only
 * lets a user manage their own rows, so cross-user delivery always needs the
 * service-role client -- same shape as logAuditEvent.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
    });
    if (error) console.error("notification insert failed", params.type, error.message);
  } catch (err) {
    console.error("notification insert threw", params.type, err);
  }
}
