import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { purgeAccountPersonalData } from "@/lib/account/purge";

const REVIEW_TO_PURGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * E3, external PRD review: automates the 30-day clock Privacy Policy
 * Section 6 (/privacy) promises ("deleted within 30 days of a verified
 * deletion request") for a request an admin has already reviewed (their
 * verification step -- see reviewAccountDeletionRequest, src/lib/admin/
 * actions.ts) but not manually actioned in the meantime. Runs
 * opportunistically off the existing notifications cron (src/app/api/cron/
 * notifications/route.ts), same reasoning as purgeStaleReferrals: no
 * separate schedule needed for a job this infrequent and non-time-critical.
 *
 * Plain server-only, not "use server" -- like purgeStaleReferrals, this has
 * no auth check of its own (there's no live admin session in a cron
 * context to check) and must not become a client-callable action.
 */
export async function purgeReviewedAccountDeletions(): Promise<{ purged: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REVIEW_TO_PURGE_MS).toISOString();

  const { data: dueRequests } = await admin
    .from("account_deletion_requests")
    .select("id, user_id, admin_id")
    .eq("status", "reviewed")
    .lt("reviewed_at", cutoff);

  if (!dueRequests || dueRequests.length === 0) return { purged: 0 };

  let purged = 0;
  for (const request of dueRequests) {
    // admin_id is set by reviewAccountDeletionRequest at review time --
    // always present for a row that reached "reviewed", but skip
    // defensively rather than let one bad row crash the whole run.
    if (!request.admin_id) continue;
    try {
      await purgeAccountPersonalData(request.user_id, { adminId: request.admin_id, requestId: request.id });
      await admin
        .from("account_deletion_requests")
        .update({ status: "actioned" })
        .eq("id", request.id)
        .eq("status", "reviewed"); // don't clobber a request an admin already actioned manually in the meantime
      purged += 1;
    } catch (err) {
      console.error("purgeReviewedAccountDeletions: failed for request", request.id, err);
    }
  }

  return { purged };
}
