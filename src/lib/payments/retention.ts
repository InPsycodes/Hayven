import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const PAYMENT_RETENTION_MS = 6 * 365 * 24 * 60 * 60 * 1000; // ~6 years

/**
 * E3 follow-up, external PRD review. Privacy Policy Section 6 (/privacy):
 * "Payment and transaction records are kept for 6 years, on a separate
 * retention timeline independent of account and clinical-record retention
 * periods" -- anchored to the transaction date (payments.created_at), not
 * a child's last session or an account's deletion request.
 *
 * A plain age-based delete: nothing FKs to payments.id (confirmed by grep
 * across every migration), so this never risks a foreign-key violation the
 * way the clinical/account purges have to reason carefully about.
 */
export async function purgeAgedOutPayments(): Promise<{ purged: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - PAYMENT_RETENTION_MS).toISOString();

  const { data, error } = await admin.from("payments").delete().lt("created_at", cutoff).select("id");
  if (error) {
    console.error("purgeAgedOutPayments failed", error.message);
    return { purged: 0 };
  }
  return { purged: data?.length ?? 0 };
}
