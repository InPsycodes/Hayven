// Client-safe, pure helpers for the Flutterwave integration. The API calls
// themselves live in flutterwave.ts (server-only).

/** Our reference for a booking payment: "hv_<bookingId>_<timestamp>". Unique per attempt, as Flutterwave requires. */
export function bookingTxRef(bookingId: string, now = Date.now()): string {
  return `hv_${bookingId}_${now}`;
}

const TX_REF = /^hv_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_\d+$/i;

/**
 * The booking a payment belongs to, read from our own tx_ref rather than
 * from metadata sent through the checkout, so a payment can always be
 * matched back to its booking from Flutterwave's record alone.
 */
export function bookingIdFromTxRef(txRef: string | null | undefined): string | null {
  if (!txRef) return null;
  return TX_REF.exec(txRef)?.[1]?.toLowerCase() ?? null;
}

/**
 * The de-duplication key for a webhook delivery. Flutterwave sends the same
 * secret on every delivery, so the event itself identifies a repeat: the
 * same event, for the same Flutterwave record, in the same state.
 */
export function webhookEventKey(event: string, id: string | number | null | undefined, status: string | null | undefined): string | null {
  if (id === null || id === undefined || id === "") return null;
  return `${event}:${id}:${(status ?? "").toLowerCase()}`;
}

/** Flutterwave transfer statuses, as sent in transfer webhooks and lookups. */
export type TransferOutcome = "paid" | "failed" | "pending";

export function transferOutcome(status: string | null | undefined): TransferOutcome {
  const s = (status ?? "").toUpperCase();
  if (s === "SUCCESSFUL") return "paid";
  if (s === "FAILED") return "failed";
  return "pending"; // NEW, PENDING
}

/** Flutterwave refund statuses: "completed", "completed-bank-transfer", ..., "pending-...", "processing", "failed". */
export type RefundOutcome = "processed" | "failed" | "pending";

export function refundOutcome(status: string | null | undefined): RefundOutcome {
  const s = (status ?? "").toLowerCase();
  if (s.startsWith("completed")) return "processed";
  if (s.startsWith("fail") || s === "cancelled") return "failed";
  return "pending";
}
