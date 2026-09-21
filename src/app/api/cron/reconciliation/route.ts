import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { reconcilePaystackPayments } from "@/lib/payments/reconciliation";

// Timing-safe, same reasoning as the notifications cron and the Paystack
// webhook's signature check: a plain `===` leaks how many leading
// characters matched via response-time differences.
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * E18(b), external PRD review. Called hourly by pg_cron (migration 0088,
 * same vault-secret pattern as the notifications cron, migration 0070) --
 * not latency-sensitive like notifications, so no GitHub Actions backstop
 * here; a missed run just means the next one covers it too (the sweep's
 * window overlaps run-to-run by design).
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!expected || !provided || !timingSafeEqualString(provided, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcilePaystackPayments();
  return NextResponse.json(result);
}
