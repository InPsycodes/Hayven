import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface FullGoal {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  baselineValue: string | null;
  targetValue: string | null;
  unit: string | null;
  status: string;
  therapistId: string;
  therapistName: string | null;
}

export interface FullTargetBehaviour {
  id: string;
  label: string;
  definition: string | null;
  direction: string;
  measurement: string;
  parentLabel: string | null;
  isActive: boolean;
}

export interface FullSkill {
  id: string;
  label: string;
  masteryCriteria: string | null;
  currentPercent: number | null;
  isActive: boolean;
}

export interface FullChildProgramme {
  goals: FullGoal[];
  targetBehaviours: FullTargetBehaviour[];
  skills: FullSkill[];
}

/** Unfiltered -- includes met/paused/discontinued goals and inactive behaviours/skills, unlike getChildProgramme (which only returns what a session entry form needs). For the programme management page. */
export async function getFullChildProgramme(childId: string): Promise<FullChildProgramme> {
  const supabase = await createClient();
  const [goalsRes, behavioursRes, skillsRes] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "id, title, description, domain, baseline_value, target_value, unit, status, therapist_id, therapist_profiles(user_id, users(full_name))"
      )
      .eq("child_id", childId)
      .order("created_at"),
    supabase
      .from("target_behaviours")
      .select("id, label, definition, direction, measurement, parent_label, is_active")
      .eq("child_id", childId)
      .order("label"),
    supabase
      .from("skills")
      .select("id, label, mastery_criteria, current_percent, is_active")
      .eq("child_id", childId)
      .order("label"),
  ]);

  return {
    goals: (goalsRes.data ?? []).map((g) => {
      const profile = g.therapist_profiles as unknown as { users: { full_name: string } | null } | null;
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        domain: g.domain,
        baselineValue: g.baseline_value,
        targetValue: g.target_value,
        unit: g.unit,
        status: g.status,
        therapistId: g.therapist_id,
        therapistName: profile?.users?.full_name ?? null,
      };
    }),
    targetBehaviours: (behavioursRes.data ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      definition: b.definition,
      direction: b.direction,
      measurement: b.measurement,
      parentLabel: b.parent_label,
      isActive: b.is_active,
    })),
    skills: (skillsRes.data ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      masteryCriteria: s.mastery_criteria,
      currentPercent: s.current_percent,
      isActive: s.is_active,
    })),
  };
}
