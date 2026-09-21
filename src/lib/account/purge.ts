import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";

const PURGE_EMAIL_DOMAIN = "deleted.hayven.invalid";

/**
 * E3, external PRD review. Privacy Policy Section 6 (/privacy) promises
 * "personal account information (name, contact details, non-clinical data)
 * is deleted within 30 days of a verified deletion request" -- nothing in
 * the codebase did this before now (account_deletion_requests, migration
 * 0036, was a tracking-only queue by explicit design: "no code anywhere
 * reads this table to actually delete anything").
 *
 * Never deletes the users row or the auth.users row: children.parent_id,
 * therapist_profiles.user_id, and notifications.user_id all cascade from
 * public.users (migration 0001), and public.users itself cascades from
 * auth.users -- deleting either would destroy exactly the clinical records
 * Section 6 separately promises to keep up to 6 years past account
 * deletion. Anonymizes public.users in place instead, and soft-deletes the
 * auth identity (Supabase's shouldSoftDelete flag) so the account can never
 * sign in again without the row's existence -- or anything that cascades
 * from it -- ever changing.
 *
 * A therapist's (or admin's) full_name is left alone -- only email/phone
 * are scrubbed. It's the attribution on every session note, report, and
 * goal a therapist ever wrote (or verification decision / audit-logged
 * action an admin ever took), which the same policy section requires to
 * stay legible for 6 years past a child's last session. A parent's name
 * carries no such downstream attribution need, so it's fully anonymized.
 *
 * Explicitly out of scope here: the 6-year clinical/financial purge and the
 * 24-month audit-log purge the same policy section separately promises --
 * those anchor to different events (a child's last session, a transaction
 * date) and need their own design pass.
 *
 * Scoped only to what Section 6 actually names ("name, contact details,
 * non-clinical data") -- a therapist's public listing content
 * (therapist_profiles.bio/location, the avatars storage bucket) is business-
 * listing content the therapist chose to publish, not personal contact
 * data, and is deliberately left untouched by this pass.
 *
 * Idempotent: safe to call twice for the same user (the manual "Mark
 * actioned" path and the 30-days-after-review cron path can both reach it
 * for the same request without erroring or double-logging).
 */
export async function purgeAccountPersonalData(
  userId: string,
  authorizedBy: { adminId: string; requestId: string }
): Promise<void> {
  const admin = createAdminClient();

  const { data: user } = await admin.from("users").select("id, role, email").eq("id", userId).maybeSingle();
  if (!user) return; // never existed, or the users row was somehow already removed
  if (user.email.endsWith(`@${PURGE_EMAIL_DOMAIN}`)) return; // already purged -- idempotent no-op

  const anonymizedEmail = `deleted-${userId}@${PURGE_EMAIL_DOMAIN}`;
  const update =
    user.role === "parent"
      ? { full_name: "Deleted user", email: anonymizedEmail, phone: null, status: "suspended" as const }
      : { email: anonymizedEmail, phone: null, status: "suspended" as const };

  await admin.from("users").update(update).eq("id", userId);

  await admin.from("notification_preferences").delete().eq("user_id", userId);
  await admin.from("push_subscriptions").delete().eq("user_id", userId);

  // shouldSoftDelete=true: marks the auth identity deleted (can never sign
  // in again) without removing the auth.users row -- removing it would
  // cascade straight through to public.users and everything hanging off it.
  const { error: authError } = await admin.auth.admin.deleteUser(userId, true);
  if (authError) console.error("purgeAccountPersonalData: auth soft-delete failed", userId, authError.message);

  const { data: adminUser } = await admin
    .from("users")
    .select("full_name")
    .eq("id", authorizedBy.adminId)
    .maybeSingle();
  await logAuditEvent({
    actor: { userId: authorizedBy.adminId, role: "admin", name: adminUser?.full_name ?? "Unknown admin", isSupervisor: false },
    action: "account.purge_personal_data",
    entityType: "user",
    entityId: userId,
    metadata: { requestId: authorizedBy.requestId, role: user.role },
  });
}
