import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import type { AssignedChild, CareTeamMember, ChildProgramme } from "./types";

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
    supabase
      .from("skills")
      .select("id, label, current_percent, domain_type")
      .eq("child_id", childId)
      .eq("is_active", true),
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
      domainType: s.domain_type as ChildProgramme["skills"][number]["domainType"],
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

/**
 * Other therapists actively sharing this child's care -- the viewing
 * therapist's own row is excluded.
 *
 * Reads via the service-role client, not the regular one: public.users only
 * lets a user read their OWN row (`id = auth.uid()`, migration 0002) --
 * there's no policy letting one therapist read another's full_name at all.
 * The original version embedded `users(full_name)` through the regular
 * client and silently came back empty for every caller (the embed's nested
 * relation was RLS-blocked, not erroring loudly), caught only by an
 * integration test signing in as two real therapists and checking the
 * actual return value. Since this bypasses RLS, it re-verifies in code that
 * the caller genuinely owns excludeTherapistProfileId and is themselves
 * actively assigned to this child before returning anyone else's data --
 * otherwise any signed-in therapist could pass an arbitrary child id and
 * profile id to see a roster they were never on.
 */
export async function getCareTeamForChild(
  childId: string,
  excludeTherapistProfileId: string
): Promise<CareTeamMember[]> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return [];

  const admin = createAdminClient();
  const { data: callerAssignment } = await admin
    .from("therapist_child_assignments")
    .select("id, therapist_profiles(user_id)")
    .eq("child_id", childId)
    .eq("therapist_id", excludeTherapistProfileId)
    .eq("status", "active")
    .maybeSingle();
  const callerProfile = callerAssignment?.therapist_profiles as unknown as { user_id: string } | null;
  if (!callerAssignment || callerProfile?.user_id !== session.userId) return [];

  const { data, error } = await admin
    .from("therapist_child_assignments")
    .select("therapist_id, therapy_type, started_on, therapist_profiles(user_id, users(full_name))")
    .eq("child_id", childId)
    .eq("status", "active")
    .neq("therapist_id", excludeTherapistProfileId);
  if (error || !data) return [];

  return data
    .map((row) => {
      const profile = row.therapist_profiles as unknown as { users: { full_name: string } | null } | null;
      const name = profile?.users?.full_name;
      if (!name) return null;
      return { therapistId: row.therapist_id, name, therapyType: row.therapy_type, since: row.started_on };
    })
    .filter((m): m is CareTeamMember => Boolean(m));
}
