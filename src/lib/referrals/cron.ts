import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deliberately NOT in actions.ts: that file is "use server", and every
 * function exported from a "use server" file is a real Next.js server
 * action, reachable through the framework's own client-callable RPC
 * mechanism if anything ever references it from a Client Component -- with
 * no session/actor to check (this runs from a cron route, not a signed-in
 * request), there'd be nothing internal stopping an unrelated caller from
 * invoking a mass-delete on demand. Plain "server-only" (matching
 * src/lib/notifications/cron.ts, which has the identical shape: scheduled,
 * unauthenticated-by-itself, relying entirely on its caller's own guard)
 * makes that structurally impossible rather than relying on nothing in the
 * client bundle happening to import it.
 *
 * E21 from the external PRD review: a referral that never converted (the
 * family was never reached, or declined) has no ongoing reason to keep a
 * child's name, age, and a parent's contact details on file indefinitely --
 * the whole record only ever existed to support the one-time outreach.
 * 90 days is a judgment call, not a legal minimum: long enough that a
 * referral genuinely still being worked doesn't get swept up (the admin
 * queue's own stated SLA is "within one business day" for first contact),
 * short enough to meaningfully bound how long stale PII sits around.
 * care_started referrals are never purged -- at that point the family is a
 * real Hayven user and their record lives under the normal account/child
 * data lifecycle, not this one.
 *
 * Not audit-logged: audit_log.actor_id is NOT NULL with a real FK to users,
 * and there's no system-actor convention in this codebase to attribute an
 * automated action to (the same reason session auto-completion and
 * notification sends in notifications/cron.ts aren't audit-logged either).
 * The purged count is returned instead, visible in the cron route's own
 * response/logs.
 */
const REFERRAL_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export async function purgeStaleReferrals(): Promise<{ purged: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REFERRAL_RETENTION_MS).toISOString();

  const { data, error } = await admin
    .from("referrals")
    .delete()
    .neq("status", "care_started")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.error("purgeStaleReferrals failed", error.message);
    return { purged: 0 };
  }
  return { purged: data?.length ?? 0 };
}
