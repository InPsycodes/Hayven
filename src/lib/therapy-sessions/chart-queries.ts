import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface SessionSeriesWindow {
  sessions: { id: string; sessionDate: string; durationMinutes: number | null }[];
  behaviours: { id: string; label: string; measurement: string; direction: string }[];
  skills: { id: string; label: string }[];
  goals: { id: string; title: string }[];
  behaviourEntries: {
    sessionId: string;
    behaviourId: string;
    count: number | null;
    durationSeconds: number | null;
    intensity: number | null;
  }[];
  skillEntries: { sessionId: string; skillId: string; trialsTotal: number | null; trialsCorrect: number | null }[];
  goalEntries: { sessionId: string; goalId: string; percentComplete: number }[];
  reinforcers: { sessionId: string; label: string; effectiveness: number | null }[];
}

/** One query pass per child, not one per chart -- six charts share this. */
export async function getSessionSeriesWindow(
  childId: string,
  opts?: { limitSessions?: number }
): Promise<SessionSeriesWindow> {
  const supabase = await createClient();
  const limit = opts?.limitSessions ?? 12;

  const [{ data: sessionsDesc }, { data: behaviours }, { data: skills }, { data: goals }] = await Promise.all([
    supabase
      .from("therapy_sessions")
      .select("id, session_date, duration_minutes")
      .eq("child_id", childId)
      .eq("status", "complete")
      .order("session_date", { ascending: false })
      .limit(limit),
    supabase.from("target_behaviours").select("id, label, measurement, direction").eq("child_id", childId),
    supabase.from("skills").select("id, label").eq("child_id", childId),
    supabase.from("goals").select("id, title").eq("child_id", childId),
  ]);

  const sessions = (sessionsDesc ?? [])
    .slice()
    .reverse()
    .map((s) => ({ id: s.id, sessionDate: s.session_date, durationMinutes: s.duration_minutes }));
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    return {
      sessions: [],
      behaviours: (behaviours ?? []).map((b) => ({
        id: b.id,
        label: b.label,
        measurement: b.measurement,
        direction: b.direction,
      })),
      skills: (skills ?? []).map((s) => ({ id: s.id, label: s.label })),
      goals: (goals ?? []).map((g) => ({ id: g.id, title: g.title })),
      behaviourEntries: [],
      skillEntries: [],
      goalEntries: [],
      reinforcers: [],
    };
  }

  const [{ data: behaviourEntries }, { data: skillEntries }, { data: goalEntries }, { data: reinforcers }] =
    await Promise.all([
      supabase
        .from("session_behaviour_entries")
        .select("session_id, target_behaviour_id, count, duration_seconds, intensity")
        .in("session_id", sessionIds),
      supabase
        .from("session_skill_entries")
        .select("session_id, skill_id, trials_total, trials_correct")
        .in("session_id", sessionIds),
      supabase.from("session_goal_progress").select("session_id, goal_id, percent_complete").in("session_id", sessionIds),
      supabase.from("session_reinforcers").select("session_id, label, effectiveness").in("session_id", sessionIds),
    ]);

  return {
    sessions,
    behaviours: (behaviours ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      measurement: b.measurement,
      direction: b.direction,
    })),
    skills: (skills ?? []).map((s) => ({ id: s.id, label: s.label })),
    goals: (goals ?? []).map((g) => ({ id: g.id, title: g.title })),
    behaviourEntries: (behaviourEntries ?? []).map((e) => ({
      sessionId: e.session_id,
      behaviourId: e.target_behaviour_id,
      count: e.count,
      durationSeconds: e.duration_seconds,
      intensity: e.intensity,
    })),
    skillEntries: (skillEntries ?? []).map((e) => ({
      sessionId: e.session_id,
      skillId: e.skill_id,
      trialsTotal: e.trials_total,
      trialsCorrect: e.trials_correct,
    })),
    goalEntries: (goalEntries ?? []).map((e) => ({
      sessionId: e.session_id,
      goalId: e.goal_id,
      percentComplete: e.percent_complete,
    })),
    reinforcers: (reinforcers ?? []).map((r) => ({
      sessionId: r.session_id,
      label: r.label,
      effectiveness: r.effectiveness,
    })),
  };
}
