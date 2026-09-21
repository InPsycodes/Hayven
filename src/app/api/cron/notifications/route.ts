import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  notifySessionsStarted,
  notifySessionsFinished,
  notifyUnreadReportReminders,
  notifyUpcomingSessions,
  notifyOnboardingCheckins,
} from "@/lib/notifications/cron";
import { purgeStaleReferrals } from "@/lib/referrals/cron";
import { purgeReviewedAccountDeletions } from "@/lib/account/cron";
import { purgeExpiredAuditLogs } from "@/lib/audit/cron";

// Timing-safe, same reasoning as the Paystack webhook's signature check: a
// plain `===` leaks how many leading characters matched via response-time
// differences.
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Called every 15 minutes by a GitHub Actions scheduled workflow
 * (.github/workflows/notifications-cron.yml), not Vercel Cron -- Vercel's
 * Hobby plan only allows daily cron schedules, which silently blocked every
 * deployment once vercel.json declared this at *\/15 * * * *. The workflow
 * sends the same `Authorization: Bearer $CRON_SECRET` header any pinger
 * would; this route doesn't know or care who's calling it, only that they
 * know the secret.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!expected || !provided || !timingSafeEqualString(provided, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [started, finished, reminders, upcoming, checkins, referralsPurged, accountsPurged, auditLogsPurged] =
    await Promise.all([
      notifySessionsStarted(),
      notifySessionsFinished(),
      notifyUnreadReportReminders(),
      notifyUpcomingSessions(),
      notifyOnboardingCheckins(),
      purgeStaleReferrals(),
      purgeReviewedAccountDeletions(),
      purgeExpiredAuditLogs(),
    ]);

  return NextResponse.json({
    sessionsStarted: started,
    sessionsFinished: finished,
    reportReminders: reminders,
    upcomingReminders: upcoming,
    onboardingCheckins: checkins,
    referralsPurged: referralsPurged.purged,
    accountsPurged: accountsPurged.purged,
    auditLogsPurged: auditLogsPurged.purged,
  });
}
