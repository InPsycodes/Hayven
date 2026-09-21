import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// E18(a), external PRD review. The prior audits (docs/production-audit-
// 2026-09-03.md, docs/full-platform-diagnostic-2026-09-16.md) already
// classified "uptime alerting" itself as an ops/account task -- pointing an
// external pinger (UptimeRobot, Better Uptime, ...) at the site -- not
// something to build. The only code-shaped piece missing was something for
// that pinger to hit that actually proves the app can reach its database,
// not just that Next.js is serving requests. No auth: a health check has to
// be reachable by an external monitor with no credentials, and this leaks
// nothing beyond "the database did or didn't respond."
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("users").select("id", { count: "exact", head: true }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
