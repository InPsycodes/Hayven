import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AssignedChild, ChildProgramme } from "./types";

export async function getAssignedChildren(therapistProfileId: string): Promise<AssignedChild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("therapist_child_assignments")
    .select("children(id, first_name, date_of_birth)")
    .eq("therapist_id", therapistProfileId)
    .eq("status", "active");
  if (error || !data) return [];

  return data
    .map((row) => row.children as unknown as { id: string; first_name: string; date_of_birth: string } | null)
    .filter((c): c is { id: string; first_name: string; date_of_birth: string } => Boolean(c))
    .map((c) => ({ id: c.id, firstName: c.first_name, dateOfBirth: c.date_of_birth }));
}

export async function getChildProgramme(childId: string): Promise<ChildProgramme> {
  const supabase = await createClient();
  const [goalsRes, behavioursRes, skillsRes] = await Promise.all([
    supabase.from("goals").select("id, title, domain, status").eq("child_id", childId).order("created_at"),
    supabase
      .from("target_behaviours")
      .select("id, label, parent_label, measurement, direction")
      .eq("child_id", childId)
      .eq("is_active", true),
    supabase.from("skills").select("id, label, current_percent").eq("child_id", childId).eq("is_active", true),
  ]);

  return {
    goals: (goalsRes.data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      domain: g.domain,
      status: g.status,
    })),
    targetBehaviours: (behavioursRes.data ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      parentLabel: b.parent_label,
      measurement: b.measurement,
      direction: b.direction,
    })),
    skills: (skillsRes.data ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      currentPercent: s.current_percent,
    })),
  };
}

export async function getAssignedChildById(childId: string, therapistProfileId: string): Promise<AssignedChild | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapist_child_assignments")
    .select("children(id, first_name, date_of_birth)")
    .eq("child_id", childId)
    .eq("therapist_id", therapistProfileId)
    .eq("status", "active")
    .maybeSingle();
  const child = data?.children as unknown as { id: string; first_name: string; date_of_birth: string } | null;
  if (!child) return null;
  return { id: child.id, firstName: child.first_name, dateOfBirth: child.date_of_birth };
}
