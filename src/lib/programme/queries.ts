import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

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

/**
 * Unfiltered -- includes met/paused/discontinued goals and inactive
 * behaviours/skills, unlike getChildProgramme (which only returns what a
 * session entry form needs). For the programme management page.
 *
 * The goals query reads via the service-role client, not the regular one:
 * public.users only lets a user read their OWN row (migration 0002), so
 * embedding therapist_profiles(user_id, users(full_name)) through the
 * regular client silently comes back with therapistName: null for every
 * goal that isn't the caller's own -- exactly the "Set by {name}" label a
 * care-team member most needs to see, and the same bug independently found
 * in getCareTeamForChild (both fixed together). Re-verifies the caller is
 * actually an active therapist on this child before using the elevated
 * client, since that check is no longer coming from RLS on this query.
 */
export async function getFullChildProgramme(childId: string): Promise<FullChildProgramme> {
  const supabase = await createClient();
  const session = await getSession();

  let isAuthorizedTherapist = false;
  if (session?.role === "therapist") {
    // Scoped to the CALLER's own therapist_profiles row before checking the
    // assignment -- a plain "any active assignment for this child" check
    // would use .maybeSingle() against a table that can legitimately have
    // several active rows per child (the whole point of the care-team
    // model), and .maybeSingle() errors on more than one match rather than
    // picking one, which would make this silently fail closed for every
    // child with more than one assigned therapist.
    const { data: ownProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (ownProfile) {
      const admin = createAdminClient();
      const { data: assignment } = await admin
        .from("therapist_child_assignments")
        .select("id")
        .eq("child_id", childId)
        .eq("therapist_id", ownProfile.id)
        .eq("status", "active")
        .maybeSingle();
      isAuthorizedTherapist = !!assignment;
    }
  }

  const goalsClient = isAuthorizedTherapist ? createAdminClient() : supabase;

  const [goalsRes, behavioursRes, skillsRes] = await Promise.all([
    goalsClient
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
