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
  if (!payout || payout.status === "paid") return;

  if (event === "transfer.success") {
    await admin.from("payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payout.id);
    await admin.from("therapist_earnings").update({ status: "paid" }).eq("payout_id", payout.id);
    return;
  }

  // failed / reversed
  await admin
    .from("payouts")
    .update({ status: "failed", failure_reason: event })
    .eq("id", payout.id);
  await admin
    .from("therapist_earnings")
    .update({ payout_id: null, status: "pending" })
    .eq("payout_id", payout.id);
}
