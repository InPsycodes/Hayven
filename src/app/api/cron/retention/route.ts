import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { purgeAgedOutClinicalRecords } from "@/lib/clinical/purge";
import { purgeAgedOutPayments } from "@/lib/payments/retention";
import { expireInactiveAssignments } from "@/lib/assignments/cron";

// Timing-safe, same reasoning as the notifications cron and the Flutterwave
// webhook's signature check: a plain `===` leaks how many leading
// characters matched via response-time differences.
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * E3 follow-up, external PRD review. The 6-year clinical (src/lib/clinical/
 * purge.ts) and payment (src/lib/payments/retention.ts) purges Privacy
 * Policy Section 6 promises -- separate from the 15-minute notifications
 * cron and the hourly reconciliation cron: this is yearly-scale housekeeping
 * with no reason to run more than once a day, and the clinical sweep costs
 * one query per not-yet-purged child, which is wasted work at a 15-minute
 * or even hourly cadence. Scheduled daily via pg_cron (migration 0089, same
 * vault-secret pattern as 0070/0088). Also carries expireInactiveAssignments
 * (E5, src/lib/assignments/cron.ts) -- a different concern (access
 * lifecycle, not data retention) that shares this route purely because it
 * has the same "not time-critical, daily is plenty" cadence.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!expected || !provided || !timingSafeEqualString(provided, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [clinicalRecordsPurged, paymentsPurged, assignmentsExpired] = await Promise.all([
    purgeAgedOutClinicalRecords(),
    purgeAgedOutPayments(),
    expireInactiveAssignments(),
  ]);

  return NextResponse.json({
    clinicalRecordsPurged: clinicalRecordsPurged.purged,
    paymentsPurged: paymentsPurged.purged,
    assignmentsExpired: assignmentsExpired.expired,
  });
}
