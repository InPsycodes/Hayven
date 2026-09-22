import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssignedChild } from "@/lib/therapy-sessions/types";
import type { AdminPickerOption } from "@/lib/admin/queries";

export interface SupervisedTherapist {
  id: string;
  name: string;
  childCount: number;
}

/** Cheap count-only query for a sidebar badge -- no need to join therapist_profiles/users just for a team size. */
export async function getMySupervisedTherapistCount(supervisorId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("supervisor_assignments")
    .select("id", { count: "exact", head: true })
    .eq("supervisor_id", supervisorId)
    .eq("status", "active");
  return count ?? 0;
}

export async function getMySupervisedTherapists(supervisorId: string): Promise<SupervisedTherapist[]> {
  // RLS-01, pre-launch audit: a supervisor's own RLS grant on `users` only
  // ever needed to expose a supervised therapist's name (0027's own
  // comment), but it was table/row-scoped with no column limit, so it
  // handed over email/phone/status/role too. Rather than a table-wide
  // column-scoped grant (which would also restrict every OTHER
  // authenticated user's read of their own full row -- Postgres GRANTs are
  // role-wide, not per-caller), the query itself is already correctly
  // scoped to this exact supervisorId's own active team, so the admin
  // client is the simplest fix consistent with this codebase's established
  // "ownership already verified, defense in depth" pattern.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("supervisor_assignments")
    .select("therapist_profiles(id, users(full_name))")
    .eq("supervisor_id", supervisorId)
    .eq("status", "active");

  const therapists = (data ?? [])
    .map((row) => row.therapist_profiles as unknown as { id: string; users: { full_name: string } | null } | null)
    .filter((t): t is { id: string; users: { full_name: string } | null } => Boolean(t));

  return Promise.all(
    therapists.map(async (t) => {
      const { count } = await supabase
        .from("therapist_child_assignments")
        .select("id", { count: "exact", head: true })
        .eq("therapist_id", t.id)
        .eq("status", "active");
      return { id: t.id, name: t.users?.full_name ?? "Unknown", childCount: count ?? 0 };
    })
  );
}

export interface TeamAssignment {
  id: string;
  therapistName: string;
  childName: string;
  therapyType: string | null;
  startedOn: string;
}

/** All active therapist-child assignments for the supervisor's own team -- for the assignments page's "currently assigned" list. */
export async function getMyTeamAssignments(supervisorId: string): Promise<TeamAssignment[]> {
  // RLS-01, pre-launch audit: see getMySupervisedTherapists above -- same
  // reasoning, needs the therapist's name via the users() embed.
  const supabase = createAdminClient();

  const { data: teamRows } = await supabase
    .from("supervisor_assignments")
    .select("therapist_id")
    .eq("supervisor_id", supervisorId)
    .eq("status", "active");
  const therapistIds = (teamRows ?? []).map((r) => r.therapist_id);
  if (therapistIds.length === 0) return [];

  const { data } = await supabase
    .from("therapist_child_assignments")
    .select("id, therapy_type, started_on, therapist_profiles(users(full_name)), children(first_name)")
    .in("therapist_id", therapistIds)
    .eq("status", "active")
    .order("started_on", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    therapistName:
      (row.therapist_profiles as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ??
      "Unknown",
    childName: (row.children as unknown as { first_name: string } | null)?.first_name ?? "Unknown",
    therapyType: row.therapy_type,
    startedOn: row.started_on,
  }));
}

export interface LapsedTeamAssignment extends TeamAssignment {
  endedOn: string | null;
  /** 'manual' | 'inactivity' | null (predates the ended_reason column, migration 0090) */
  endedReason: string | null;
}

/**
 * E5, external PRD review: lapsed (manually ended or 90-day-inactivity-
 * expired) assignments for the supervisor's own team, so care can be
 * resumed via renewTherapistChildAssignmentAsSupervisor. Capped to the most
 * recent 50, same reasoning as getLapsedTherapistChildAssignments
 * (src/lib/admin/queries.ts) -- a working queue, not a full audit history.
 */
export async function getMyLapsedTeamAssignments(supervisorId: string): Promise<LapsedTeamAssignment[]> {
  // RLS-01, pre-launch audit: see getMySupervisedTherapists above -- same
  // reasoning, needs the therapist's name via the users() embed.
  const supabase = createAdminClient();

  const { data: teamRows } = await supabase
    .from("supervisor_assignments")
    .select("therapist_id")
    .eq("supervisor_id", supervisorId)
    .eq("status", "active");
  const therapistIds = (teamRows ?? []).map((r) => r.therapist_id);
  if (therapistIds.length === 0) return [];

  const { data } = await supabase
    .from("therapist_child_assignments")
    .select(
      "id, therapy_type, started_on, ended_on, ended_reason, therapist_profiles(users(full_name)), children(first_name)"
    )
    .in("therapist_id", therapistIds)
    .in("status", ["ended", "expired"])
    .order("ended_on", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    therapistName:
      (row.therapist_profiles as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ??
      "Unknown",
    childName: (row.children as unknown as { first_name: string } | null)?.first_name ?? "Unknown",
    therapyType: row.therapy_type,
    startedOn: row.started_on,
    endedOn: row.ended_on,
    endedReason: row.ended_reason,
  }));
}

export async function getSupervisedChildrenForTherapist(
  therapistId: string,
  supervisorId: string
): Promise<AssignedChild[]> {
  const supabase = await createClient();

  const { data: supervision } = await supabase
    .from("supervisor_assignments")
    .select("id")
    .eq("supervisor_id", supervisorId)
    .eq("therapist_id", therapistId)
    .eq("status", "active")
    .maybeSingle();
  if (!supervision) return [];

  const { data } = await supabase
    .from("therapist_child_assignments")
    .select("children(id, first_name, date_of_birth)")
    .eq("therapist_id", therapistId)
    .eq("status", "active");

  return (data ?? [])
    .map((row) => row.children as unknown as { id: string; first_name: string; date_of_birth: string } | null)
    .filter((c): c is { id: string; first_name: string; date_of_birth: string } => Boolean(c))
    .map((c) => ({ id: c.id, firstName: c.first_name, dateOfBirth: c.date_of_birth }));
}

/**
 * Children a supervisor can pick from when assigning one of their team's
 * therapists -- scoped to children who already have an active assignment to
 * *some* therapist on the platform (an established Hayven client), matching
 * the RLS boundary added in migration 0032. Supervisors coordinate care for
 * children already in active treatment; they don't originate brand-new
 * clinical relationships out of the entire platform's child roster.
 */
export async function getChildrenEligibleForSupervisorAssignment(): Promise<AdminPickerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapist_child_assignments")
    .select("children(id, first_name)")
    .eq("status", "active");

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    const child = row.children as unknown as { id: string; first_name: string } | null;
    if (child) seen.set(child.id, child.first_name);
  }
  return Array.from(seen, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
}

/** Defense in depth, same shape as getAssignedChildById -- confirms this supervisor actually oversees a therapist who's assigned to this child before returning anything. */
export async function getSupervisedChildById(childId: string, supervisorId: string): Promise<AssignedChild | null> {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("therapist_child_assignments")
    .select("therapist_id")
    .eq("child_id", childId)
    .eq("status", "active");
  const therapistIds = (assignments ?? []).map((a) => a.therapist_id);
  if (therapistIds.length === 0) return null;

  const { data: supervision } = await supabase
    .from("supervisor_assignments")
    .select("id")
    .eq("supervisor_id", supervisorId)
    .in("therapist_id", therapistIds)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!supervision) return null;

  const { data: child } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return null;
  return { id: child.id, firstName: child.first_name, dateOfBirth: child.date_of_birth };
}
