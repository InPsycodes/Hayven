import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Data for the warm-dark "care portal" dashboards that isn't already covered
 * by an existing query. Everything here is scoped to what the caller's RLS
 * actually allows -- notably, a parent can read `goals` and `bookings` but
 * NOT `therapy_sessions` / `session_goal_progress` (deliberate, see
 * migration 0011), so the parent progress view is built from goal status +
 * attendance, not per-session scores.
 */

export interface ParentGoal {
  id: string;
  title: string;
  domain: string | null;
  status: string;
}

/** The child's therapy goals, parent-readable (title / domain / status only). */
export async function getChildGoalsForParent(childId: string): Promise<ParentGoal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("id, title, domain, status")
    .eq("child_id", childId)
    .order("created_at");
  return (data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    domain: g.domain,
    status: g.status,
  }));
}

export interface WeekPoint {
  /** Monday of the week, ISO date. */
  weekStart: string;
  attended: number;
  missed: number;
}

/**
 * Weekly attended / missed counts for the last `weeks` weeks, from a
 * pre-fetched booking list (caller already has getRealBookingsForParent /
 * ForTherapist). Keeps this a pure function -- no extra round trip.
 */
export function weeklyAttendance(
  bookings: { status: string; slotStartTime: string }[],
  weeks = 14
): WeekPoint[] {
  const now = new Date();
  const day = now.getUTCDay();
  const thisMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (day === 0 ? -6 : 1 - day))
  );
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  const buckets: WeekPoint[] = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(thisMonday.getTime() - (weeks - 1 - i) * WEEK).toISOString().slice(0, 10),
    attended: 0,
    missed: 0,
  }));

  const firstWeekMs = new Date(buckets[0].weekStart).getTime();
  for (const b of bookings) {
    if (!b.slotStartTime) continue;
    const weekIdx = Math.floor((new Date(b.slotStartTime).getTime() - firstWeekMs) / WEEK);
    if (weekIdx < 0 || weekIdx >= weeks) continue;
    if (b.status === "completed" || b.status === "confirmed") buckets[weekIdx].attended += 1;
    else if (b.status === "cancelled" || b.status === "no_show") buckets[weekIdx].missed += 1;
  }
  return buckets;
}

export interface MonthPoint {
  /** "Mar", "Apr" … */
  label: string;
  earnings: number;
  sessions: number;
}

/**
 * Monthly earnings + session count for a therapist over the last `months`
 * months. Therapist-scoped: reads `payments` (payee_id = the therapist's
 * user id) and `therapy_sessions` via the therapist profile.
 */
export async function getTherapistMonthlySeries(
  therapistUserId: string,
  therapistProfileId: string,
  months = 6
): Promise<MonthPoint[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const [paymentsRes, sessionsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, created_at, type, status")
      .eq("payee_id", therapistUserId)
      .gte("created_at", start.toISOString()),
    supabase
      .from("therapy_sessions")
      .select("session_date, status")
      .eq("therapist_id", therapistProfileId)
      .gte("session_date", start.toISOString().slice(0, 10)),
  ]);

  const points: MonthPoint[] = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return { label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), earnings: 0, sessions: 0 };
  });
  const monthIndex = (iso: string) => {
    const d = new Date(iso);
    return (d.getUTCFullYear() - start.getUTCFullYear()) * 12 + (d.getUTCMonth() - start.getUTCMonth());
  };

  for (const p of paymentsRes.data ?? []) {
    if (p.status !== "successful" || p.type !== "session_commission") continue;
    const idx = monthIndex(p.created_at);
    if (idx >= 0 && idx < months) points[idx].earnings += p.amount;
  }
  for (const s of sessionsRes.data ?? []) {
    if (s.status === "draft") continue;
    const idx = monthIndex(`${s.session_date}T00:00:00Z`);
    if (idx >= 0 && idx < months) points[idx].sessions += 1;
  }
  return points;
}
