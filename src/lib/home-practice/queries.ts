import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { toLagosWallClock } from "@/data/format";
import type { HomePracticeActivity, HomePracticeNextStep, HomePracticeOutcome } from "./types";

/** Today's date in Lagos, YYYY-MM-DD. Tries are logged against the family's own calendar day. */
export function lagosToday(): string {
  return toLagosWallClock(new Date()).toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The seven days the parent's week strip shows: starting the day after the
 * latest session that set an activity, so the strip runs from that session
 * to the next, but never starting in the future or more than six days ago.
 */
export function practiceWeek(activities: HomePracticeActivity[], today = lagosToday()): string[] {
  const latestSetOn = activities.reduce((max, a) => (a.setOn > max ? a.setOn : max), "");
  let start = latestSetOn ? addDays(latestSetOn, 1) : today;
  if (start > today) start = today;
  const earliest = addDays(today, -6);
  if (start < earliest) start = earliest;
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Active activities for a child, with every try logged since each was set.
 * Callers must already have checked the viewer may see this child (the
 * parent, or a therapist on the child's care team): these tables are only
 * reachable through the service-role client.
 */
async function loadActiveActivities(childId: string): Promise<HomePracticeActivity[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("home_practice_activities")
    .select("id, body, set_on, position, created_at, next_step, therapist_id, therapist_profiles(users(full_name))")
    .eq("child_id", childId)
    .eq("status", "active")
    .order("set_on", { ascending: false })
    .order("position", { ascending: true });
  if (!rows || rows.length === 0) return [];

  const { data: logs } = await admin
    .from("home_practice_logs")
    .select("activity_id, logged_on, outcome, note")
    .in(
      "activity_id",
      rows.map((r) => r.id)
    )
    .order("logged_on", { ascending: true });

  return rows.map((r) => {
    const profile = r.therapist_profiles as unknown as { users: { full_name: string } | null } | null;
    return {
      id: r.id,
      body: r.body,
      setOn: r.set_on,
      therapistId: r.therapist_id,
      therapistName: profile?.users?.full_name ?? "Your therapist",
      nextStep: (r.next_step as HomePracticeNextStep | null) ?? null,
      tries: (logs ?? [])
        .filter((l) => l.activity_id === r.id)
        .map((l) => ({ loggedOn: l.logged_on, outcome: l.outcome as HomePracticeOutcome, note: l.note })),
    };
  });
}

/** For the parent dashboard. Null when this child isn't the parent's. */
export async function getHomePracticeForParent(
  parentUserId: string,
  childId: string
): Promise<{ activities: HomePracticeActivity[]; week: string[]; today: string } | null> {
  const admin = createAdminClient();
  const { data: child } = await admin.from("children").select("parent_id").eq("id", childId).maybeSingle();
  if (!child || child.parent_id !== parentUserId) return null;

  const activities = await loadActiveActivities(childId);
  const today = lagosToday();
  return { activities, week: practiceWeek(activities, today), today };
}

/** True when this therapist is actively on the child's care team. */
export async function isOnCareTeam(therapistProfileId: string, childId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("therapist_child_assignments")
    .select("id")
    .eq("child_id", childId)
    .eq("therapist_id", therapistProfileId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

/**
 * For the therapist's child page: every active activity on the child (the
 * whole care team's, so practice stays coordinated), activities with a hard
 * try first. Null when the therapist isn't on the child's care team.
 */
export async function getHomePracticeForTherapist(
  therapistProfileId: string,
  childId: string
): Promise<HomePracticeActivity[] | null> {
  if (!(await isOnCareTeam(therapistProfileId, childId))) return null;
  const activities = await loadActiveActivities(childId);
  const hard = (a: HomePracticeActivity) => (a.tries.some((t) => t.outcome === "hard") ? 1 : 0);
  return activities.sort((a, b) => hard(b) - hard(a));
}
