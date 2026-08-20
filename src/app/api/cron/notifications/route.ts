import { NextRequest, NextResponse } from "next/server";

import { notifySessionsStarted, notifySessionsFinished, notifyUnreadReportReminders } from "@/lib/notifications/cron";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * CRON_SECRET is set as a project env var. An external pinger (GitHub
 * Actions, cron-job.org, etc.) needs configuring to send the same header --
 * either way, this route doesn't know or care who's calling it, only that
 * they know the secret.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [started, finished, reminders] = await Promise.all([
    notifySessionsStarted(),
    notifySessionsFinished(),
    notifyUnreadReportReminders(),
  ]);

  return NextResponse.json({ sessionsStarted: started, sessionsFinished: finished, reportReminders: reminders });
}
