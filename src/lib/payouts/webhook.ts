import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { transferOutcome } from "@/lib/payments/flutterwave-shared";

/**
 * Flutterwave transfer.completed (status SUCCESSFUL or FAILED), or a status
 * found by checking a transfer still processing. Success finalises the
 * payout; failure unwinds it, putting the earnings back to pending so the
 * next payout run retries them.
 */
export async function finalizeTransfer(
  status: string | undefined,
  reference: string | undefined,
  transferId: string | undefined
): Promise<void> {
  if (!reference && !transferId) return;
  const outcome = transferOutcome(status);
  if (outcome === "pending") return;
  const admin = createAdminClient();

  let query = admin.from("payouts").select("id, status").limit(1);
  query = reference ? query.eq("transfer_reference", reference) : query.eq("transfer_id", transferId!);
  const { data: payout } = await query.maybeSingle();
  if (!payout) return;

  if (outcome === "paid") {
    if (payout.status === "paid") return;
    await admin.from("payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payout.id);
    await admin.from("therapist_earnings").update({ status: "paid" }).eq("payout_id", payout.id);
    return;
  }

  // Failed: not gated on payout.status, since a failure can be reported
  // after an earlier success (a bank bounce). Earnings go back to pending so
  // the ledger never counts money that came back to the balance (M-6,
  // production audit 2026-09-03).
  await admin
    .from("payouts")
    .update({ status: "failed", failure_reason: `transfer ${status ?? "failed"}` })
    .eq("id", payout.id);
  await admin
    .from("therapist_earnings")
    .update({ payout_id: null, status: "pending" })
    .eq("payout_id", payout.id);
}
