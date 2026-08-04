import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RealProgressGoal {
  id: string;
  title: string;
  status: string;
}

export async function getRealProgressGoalsForChild(childId: string): Promise<RealProgressGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_goals")
    .select("id, title, status")
    .eq("child_id", childId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data;
}

export interface RealLatestProgressUpdate {
  goal: RealProgressGoal;
  quote: string;
}

/** Powers the parent dashboard's progress card -- a real quoted note, not just a percentage. */
export async function getRealLatestProgressUpdateForChild(
  childId: string
): Promise<RealLatestProgressUpdate | null> {
  const goals = await getRealProgressGoalsForChild(childId);
  const activeGoal = goals.find((g) => g.status === "in_progress") ?? goals[0];
  if (!activeGoal) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("session_notes")
    .select("recommendations")
    .eq("visible_to_parent", true)
    .contains("goals_addressed", [activeGoal.id])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    goal: activeGoal,
    quote: data?.recommendations ?? "No progress note shared yet.",
  };
}
