import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paystack transfer webhooks. `transfer.success` finalises a payout;
 * `transfer.failed` / `transfer.reversed` unwind it -- the earnings go back
 * to pending so the next payout run retries them.
 */
export async function finalizeTransfer(
  event: "transfer.success" | "transfer.failed" | "transfer.reversed",
  reference: string | undefined,
  transferCode: string | undefined
): Promise<void> {
  if (!reference && !transferCode) return;
  const admin = createAdminClient();

  let query = admin.from("payouts").select("id, status").limit(1);
  query = reference ? query.eq("paystack_reference", reference) : query.eq("paystack_transfer_code", transferCode!);
  const { data: payout } = await query.maybeSingle();
  if (!payout) return;

  if (event === "transfer.success") {
    if (payout.status === "paid") return;
    await admin.from("payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payout.id);
    await admin.from("therapist_earnings").update({ status: "paid" }).eq("payout_id", payout.id);
    return;
  }

  // failed / reversed -- a `transfer.reversed` can arrive *after*
  // `transfer.success` already landed (bank bounce, recall), so this path is
  // deliberately not gated on payout.status. `payout_status` has no distinct
  // "reversed" value, so this reuses `failed`; `failure_reason` still
  // records which webhook actually caused it. Earnings go back to pending so
  // the next payout run retries them -- otherwise the ledger overstates
  // money that came back to the balance (M-6, production audit 2026-09-03).
  await admin
    .from("payouts")
    .update({ status: "failed", failure_reason: event })
    .eq("id", payout.id);
  await admin
    .from("therapist_earnings")
    .update({ payout_id: null, status: "pending" })
    .eq("payout_id", payout.id);
}
