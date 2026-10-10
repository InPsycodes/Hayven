import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

const REMIND_AFTER_HOURS = 72;
// Past a week the practice is stale; the next session will set new ones.
const STOP_AFTER_HOURS = 7 * 24;

/**
 * One midweek nudge per session's practice: three days after a session set
 * home activities, if the family hasn't logged a single try against any of
 * them, remind the parent once. Every activity checked is marked reminded,
 * whether or not a reminder went out, so it's never considered again.
 * Parents can switch these off (email_home_practice), which gates the email
 * and push copies; the in-app notification always lands.
 */
export async function notifyHomePracticeReminders(): Promise<number> {
  const admin = createAdminClient();
  const now = Date.now();
  const { data: due } = await admin
    .from("home_practice_activities")
    .select("id, child_id, therapy_session_id, children(first_name, parent_id)")
    .eq("status", "active")
    .is("reminded_at", null)
    .lte("created_at", new Date(now - REMIND_AFTER_HOURS * 3600_000).toISOString())
    .gte("created_at", new Date(now - STOP_AFTER_HOURS * 3600_000).toISOString());
  if (!due || due.length === 0) return 0;

  const { data: logged } = await admin
    .from("home_practice_logs")
    .select("activity_id")
    .in(
      "activity_id",
      due.map((a) => a.id)
    );
  const hasTry = new Set((logged ?? []).map((l) => l.activity_id));

  // Group by the session that set them: one reminder per session's practice.
  const groups = new Map<string, typeof due>();
  for (const a of due) {
    const key = a.therapy_session_id ?? a.id;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  let sent = 0;
  const remindedChildren = new Set<string>();
  for (const group of groups.values()) {
    const anyLogged = group.some((a) => hasTry.has(a.id));
    const child = group[0].children as unknown as { first_name: string; parent_id: string } | null;
    if (!anyLogged && child && !remindedChildren.has(group[0].child_id)) {
      remindedChildren.add(group[0].child_id);
      await createNotification({
        userId: child.parent_id,
        type: "home_practice_reminder",
        entityType: "child",
        entityId: group[0].child_id,
        title: `Time for ${child.first_name}'s home practice`,
        body: `Nothing logged yet this week. Even a short try counts: open your dashboard and tap "Log a try today".`,
        url: `/parent?child=${group[0].child_id}`,
      });
      sent++;
    }
  }

  await admin
    .from("home_practice_activities")
    .update({ reminded_at: new Date().toISOString() })
    .in(
      "id",
      due.map((a) => a.id)
    );
  return sent;
}
