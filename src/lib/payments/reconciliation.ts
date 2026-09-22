import "server-only";
import * as Sentry from "@sentry/nextjs";

import { createAdminClient } from "@/lib/supabase/admin";
import { listSuccessfulTransactions, verifyTransaction } from "@/lib/payments/paystack";
import { finalizeBookingPayment } from "@/lib/booking/finalize-payment";

// E18(b), external PRD review. E2 (finalizeBookingPayment, src/lib/booking/
// actions.ts) closed the "late confirmation" race -- a webhook or redirect
// callback that eventually landed, just after the hold had already expired.
// It did not close the case where BOTH the webhook delivery and the
// redirect-verify fallback fail to fire at all (browser closed mid-redirect,
// an outage that outlasts Paystack's retry budget, ...) -- nothing ever
// calls finalizeBookingPayment for that charge, so it never gets a chance to
// run its own recovery logic. This sweep is what eventually calls it.
//
// Plain "server-only", not "use server" -- meant to run only from the cron
// route below (src/app/api/cron/reconciliation/route.ts), on the same
// pattern as src/lib/referrals/cron.ts: nothing here does its own auth
// check, so nothing should make it reachable from a client bundle.

// Wide enough that a charge missed by one run is still inside the window on
// the next few runs (this job's own reliability isn't assumed), narrow
// enough to keep each run's Paystack page count small at pilot-stage volume.
// Revisit if transaction volume grows enough to make the per-run scan (and
// the reverse-direction check's one verifyTransaction call per DB row)
// expensive.
const RECONCILIATION_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface ReconciliationResult {
  paystackChecked: number;
  replayed: number;
  stillUnresolved: number;
  dbRowsChecked: number;
  mismatched: number;
}

export async function reconcilePaystackPayments(): Promise<ReconciliationResult> {
  const admin = createAdminClient();
  const now = Date.now();
  const windowStart = new Date(now - RECONCILIATION_WINDOW_MS);

  let paystackTransactions: Awaited<ReturnType<typeof listSuccessfulTransactions>> = [];
  try {
    paystackTransactions = await listSuccessfulTransactions({
      from: windowStart.toISOString(),
      to: new Date(now).toISOString(),
    });
  } catch (err) {
    Sentry.captureMessage("Paystack reconciliation: failed to list transactions", {
      level: "error",
      tags: { anomaly: "reconciliation_list_failed" },
      extra: { error: err instanceof Error ? err.message : String(err) },
    });
    return { paystackChecked: 0, replayed: 0, stillUnresolved: 0, dbRowsChecked: 0, mismatched: 0 };
  }

  // Forward direction: Paystack says a charge succeeded -- does Hayven have
  // a matching successful payments row? If not, and the charge is a session
  // booking (carries a booking_id in its metadata, same shape the webhook
  // route reads), replay finalizeBookingPayment. It's fully idempotent
  // post-E2 -- safe to call redundantly, and it only actually writes
  // anything when the DB genuinely doesn't reflect the charge yet, so this
  // sweep doesn't need to duplicate any of its reclaim-or-refund logic.
  let replayed = 0;
  let stillUnresolved = 0;

  const references = paystackTransactions.map((t) => t.reference);
  const alreadyRecorded = new Set<string>();
  if (references.length > 0) {
    const { data: existingPayments } = await admin
      .from("payments")
      .select("gateway_reference")
      .eq("status", "successful")
      .in("gateway_reference", references);
    for (const row of existingPayments ?? []) alreadyRecorded.add(row.gateway_reference);
  }

  for (const txn of paystackTransactions) {
    if (alreadyRecorded.has(txn.reference)) continue;
    const bookingId = (txn.metadata as { booking_id?: unknown } | null)?.booking_id;
    if (typeof bookingId !== "string") continue; // not a session-booking charge -- out of scope for this sweep

    const result = await finalizeBookingPayment(bookingId, txn.reference, txn.amountKobo);
    if (result.ok) {
      replayed += 1;
    } else {
      stillUnresolved += 1;
      Sentry.captureMessage("Paystack reconciliation: a successful charge could not be resolved against Hayven's booking", {
        level: "error",
        tags: { anomaly: "reconciliation_unresolved_charge" },
        extra: { bookingId, reference: txn.reference, amountKobo: txn.amountKobo, error: result.error },
      });
    }
  }

  // Reverse direction: a payments row Hayven already marked successful --
  // does Paystack still agree? Catches drift (a refund/chargeback whose
  // webhook delivery failed, a bad manual DB edit) that nothing else
  // watches for. A mismatch here is purely a signal for a human to
  // investigate through the existing admin/disputes tooling -- this never
  // auto-reverses a payment or touches a booking.
  let dbRowsChecked = 0;
  let mismatched = 0;

  const { data: recentDbPayments } = await admin
    .from("payments")
    .select("gateway_reference, amount")
    .eq("status", "successful")
    .eq("type", "session_commission")
    .gte("created_at", windowStart.toISOString());

  for (const payment of recentDbPayments ?? []) {
    dbRowsChecked += 1;
    try {
      const verified = await verifyTransaction(payment.gateway_reference);
      if (verified.status !== "success") {
        mismatched += 1;
        Sentry.captureMessage("Paystack reconciliation: a payment Hayven marked successful no longer matches Paystack", {
          level: "error",
          tags: { anomaly: "reconciliation_db_paystack_mismatch" },
          extra: { reference: payment.gateway_reference, dbAmount: payment.amount, paystackStatus: verified.status },
        });
      }
    } catch (err) {
      // A single lookup failure (network blip, a transient Paystack error)
      // isn't worth alerting on its own -- this window overlaps the next
      // run, so it gets re-checked rather than silently skipped forever.
      console.error("Reconciliation: verifyTransaction failed", payment.gateway_reference, err);
    }
  }

  return { paystackChecked: paystackTransactions.length, replayed, stillUnresolved, dbRowsChecked, mismatched };
}
