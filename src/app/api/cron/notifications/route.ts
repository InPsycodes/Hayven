import { NextRequest, NextResponse } from "next/server";

import { notifySessionsStarted, notifySessionsFinished, notifyUnreadReportReminders } from "@/lib/notifications/cron";

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
