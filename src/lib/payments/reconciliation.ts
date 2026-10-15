import "server-only";
import * as Sentry from "@sentry/nextjs";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRefund,
  getTransfer,
  isFlutterwaveConfigured,
  listSuccessfulTransactions,
  verifyTransaction,
} from "@/lib/payments/flutterwave";
import { bookingIdFromTxRef, refundOutcome, transferOutcome } from "@/lib/payments/flutterwave-shared";
import { confirmFlutterwavePayment } from "@/lib/payments/confirm";
import { finalizeRefundByTransaction } from "@/lib/booking/webhook-refund";
import { finalizeTransfer } from "@/lib/payouts/webhook";

// E18(b), external PRD review. The webhook and the checkout redirect are
// the two normal ways a payment gets confirmed; this sweep is the backstop
// for when both fail (browser closed mid-redirect, an outage longer than
// Flutterwave's 3 retries). It also re-checks the other direction, and the
// refunds and payouts still waiting on Flutterwave.
//
// Plain "server-only", not "use server": run only from the cron route
// (src/app/api/cron/reconciliation/route.ts), which checks the cron secret.

// Wide enough that a charge missed by one run is still inside the window on
// the next few, narrow enough to keep each run's page count small.
const RECONCILIATION_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface ReconciliationResult {
  gatewayChecked: number;
  replayed: number;
  stillUnresolved: number;
  dbRowsChecked: number;
  mismatched: number;
  confirmedWithoutPayment: number;
  refundsSettled: number;
  payoutsSettled: number;
}

const EMPTY: ReconciliationResult = {
  gatewayChecked: 0,
  replayed: 0,
  stillUnresolved: 0,
  dbRowsChecked: 0,
  mismatched: 0,
  confirmedWithoutPayment: 0,
  refundsSettled: 0,
  payoutsSettled: 0,
};

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function reconcilePayments(): Promise<ReconciliationResult> {
  if (!isFlutterwaveConfigured()) return EMPTY;
  const admin = createAdminClient();
  const now = Date.now();
  const windowStart = new Date(now - RECONCILIATION_WINDOW_MS);
  const result = { ...EMPTY };

  // 1. Flutterwave says a payment succeeded: does Hayven have it? If not,
  // confirm it now. confirmFlutterwavePayment is idempotent and handles a
  // hold that expired in the meantime (reclaim the slot, or refund).
  let transactions: Awaited<ReturnType<typeof listSuccessfulTransactions>> = [];
  try {
    // Flutterwave's from/to are whole days; one extra day either side is harmless.
    transactions = await listSuccessfulTransactions({
      from: ymd(windowStart.getTime() - 86_400_000),
      to: ymd(now + 86_400_000),
    });
  } catch (err) {
    Sentry.captureMessage("Payment reconciliation: failed to list Flutterwave transactions", {
      level: "error",
      tags: { anomaly: "reconciliation_list_failed" },
      extra: { error: err instanceof Error ? err.message : String(err) },
    });
  }
  result.gatewayChecked = transactions.length;

  const refs = transactions.map((t) => t.txRef);
  const recorded = new Set<string>();
  if (refs.length > 0) {
    const { data } = await admin
      .from("payments")
      .select("gateway_reference")
      .eq("status", "successful")
      .in("gateway_reference", refs);
    for (const row of data ?? []) recorded.add(row.gateway_reference);
  }
  for (const txn of transactions) {
    if (recorded.has(txn.txRef) || !bookingIdFromTxRef(txn.txRef)) continue;
    try {
      const r = await confirmFlutterwavePayment(txn.id, txn);
      if (r.ok) {
        result.replayed += 1;
      } else {
        result.stillUnresolved += 1;
        Sentry.captureMessage("Payment reconciliation: a successful charge could not be resolved against a booking", {
          level: "error",
          tags: { anomaly: "reconciliation_unresolved_charge" },
          extra: { transactionId: txn.id, txRef: txn.txRef, amountNaira: txn.amountNaira, error: r.error },
        });
      }
    } catch (err) {
      result.stillUnresolved += 1;
      Sentry.captureMessage("Payment reconciliation: replaying a charge threw", {
        level: "error",
        tags: { anomaly: "reconciliation_replay_threw" },
        extra: { transactionId: txn.id, thrown: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  // 2. A payment Hayven marked successful: does Flutterwave still agree?
  // A mismatch is only flagged for a person; nothing is reversed here.
  const { data: recent } = await admin
    .from("payments")
    .select("gateway_transaction_id, amount")
    .eq("status", "successful")
    .eq("type", "session_commission")
    .eq("gateway", "flutterwave")
    .not("gateway_transaction_id", "is", null)
    .gte("created_at", windowStart.toISOString());
  for (const p of recent ?? []) {
    result.dbRowsChecked += 1;
    try {
      const verified = await verifyTransaction(p.gateway_transaction_id as string);
      if (verified.status !== "successful") {
        result.mismatched += 1;
        Sentry.captureMessage("Payment reconciliation: a payment Hayven marked successful no longer matches Flutterwave", {
          level: "error",
          tags: { anomaly: "reconciliation_db_gateway_mismatch" },
          extra: { transactionId: p.gateway_transaction_id, dbAmount: p.amount, gatewayStatus: verified.status },
        });
      }
    } catch (err) {
      // One failed lookup isn't worth an alert; the next run re-checks it.
      console.error("Reconciliation: verifyTransaction failed", p.gateway_transaction_id, err);
    }
  }

  // 3. A confirmed booking with no successful payment row at all (BOOK-07).
  // Surfaced only: there's no safe amount to invent a payment row from.
  const { data: confirmed } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .gte("created_at", windowStart.toISOString());
  if (confirmed && confirmed.length > 0) {
    const { data: paid } = await admin
      .from("payments")
      .select("booking_id")
      .eq("status", "successful")
      .eq("type", "session_commission")
      .in(
        "booking_id",
        confirmed.map((b) => b.id)
      );
    const paidSet = new Set((paid ?? []).map((p) => p.booking_id));
    for (const b of confirmed) {
      if (paidSet.has(b.id)) continue;
      result.confirmedWithoutPayment += 1;
      Sentry.captureMessage("Payment reconciliation: a confirmed booking still has no successful payment row", {
        level: "error",
        tags: { anomaly: "reconciliation_confirmed_booking_missing_payment" },
        extra: { bookingId: b.id },
      });
    }
  }

  // 4. Refunds still processing: ask Flutterwave in case the webhook was lost.
  const { data: refunding } = await admin
    .from("payments")
    .select("gateway_transaction_id, refund_gateway_id")
    .eq("status", "successful")
    .not("refund_gateway_id", "is", null);
  for (const p of refunding ?? []) {
    try {
      const refund = await getRefund(p.refund_gateway_id as string);
      await finalizeRefundByTransaction(refund.status, p.gateway_transaction_id as string);
      if (refundOutcome(refund.status) === "processed") result.refundsSettled += 1;
    } catch (err) {
      console.error("Reconciliation: getRefund failed", p.refund_gateway_id, err);
    }
  }

  // 5. Payouts still processing: the same for transfers.
  const { data: processing } = await admin
    .from("payouts")
    .select("transfer_id, transfer_reference")
    .eq("status", "processing")
    .not("transfer_id", "is", null);
  for (const p of processing ?? []) {
    try {
      const transfer = await getTransfer(p.transfer_id as string);
      await finalizeTransfer(transfer.status, p.transfer_reference ?? undefined, p.transfer_id as string);
      if (transferOutcome(transfer.status) === "paid") result.payoutsSettled += 1;
    } catch (err) {
      console.error("Reconciliation: getTransfer failed", p.transfer_id, err);
    }
  }

  return result;
}
