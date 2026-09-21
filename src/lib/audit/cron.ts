import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const AUDIT_LOG_RETENTION_MS = 730 * 24 * 60 * 60 * 1000; // ~24 months (730 days), matching the policy's plain-language "24 months" rather than pinning to a specific calendar rule

/**
 * E3 follow-up, external PRD review. Privacy Policy Section 6 (/privacy)
 * promises "security and audit logs are kept for 24 months, then deleted" --
 * a flat age-based window, no carve-outs in the published text (unlike the
 * clinical/payment categories, which anchor to a session or transaction
 * date and are handled separately -- see src/lib/account/purge.ts's own
 * comment for why those are a harder, still-open design).
 *
 * audit_log has no cascade dependents (nothing FKs to audit_log.id), so
 * this is a plain age-based delete -- no child/booking/payment graph to
 * reason about, unlike the clinical and payment categories.
 *
 * Plain server-only, not "use server" -- same reasoning as purgeStaleReferrals
 * and purgeReviewedAccountDeletions: no auth check of its own, must not
 * become a client-callable action.
 */
export async function purgeExpiredAuditLogs(): Promise<{ purged: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - AUDIT_LOG_RETENTION_MS).toISOString();

  const { data, error } = await admin.from("audit_log").delete().lt("created_at", cutoff).select("id");
  if (error) {
    console.error("purgeExpiredAuditLogs failed", error.message);
    return { purged: 0 };
  }
  return { purged: data?.length ?? 0 };
}
