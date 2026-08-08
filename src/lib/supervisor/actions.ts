"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";

/** Defense in depth -- real enforcement is the RLS policy from 0024 (is_supervisor_of_therapist), this just gives a friendly error instead of a silent no-op. */
async function isOwnTeamTherapist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supervisorId: string,
  therapistId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("supervisor_assignments")
    .select("id")
    .eq("supervisor_id", supervisorId)
    .eq("therapist_id", therapistId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export async function assignChildToTherapist(
  therapistId: string,
  childId: string,
  therapyType?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "supervisor") return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  if (!(await isOwnTeamTherapist(supabase, session.userId, therapistId))) {
    return { ok: false, error: "That therapist isn't on your team." };
  }

  // Defense in depth -- real enforcement is the RLS policy from 0034: a
  // supervisor can only add a team therapist to a child who's already an
  // established Hayven client (has a confirmed/completed booking with
  // someone), not an arbitrary child on the platform.
  const { data: existingClient } = await supabase
    .from("bookings")
    .select("id")
    .eq("child_id", childId)
    .in("status", ["confirmed", "completed"])
    .limit(1)
    .maybeSingle();
  if (!existingClient) {
    return { ok: false, error: "This child doesn't have a confirmed booking yet -- ask an admin to set up the first assignment." };
  }

  const { error } = await supabase.from("therapist_child_assignments").insert({
    therapist_id: therapistId,
    child_id: childId,
    therapy_type: therapyType && therapyType.trim() ? therapyType.trim() : null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This therapist is already assigned to this child." };
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.create",
    entityType: "therapist_child_assignment",
    childId,
    metadata: { therapistId },
  });

  revalidatePath("/supervisor/assignments");
  return { ok: true };
}

export async function endTherapistChildAssignmentAsSupervisor(
  assignmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "supervisor") return { ok: false, error: "Not authorized." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("therapist_child_assignments")
    .select("therapist_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!existing || !(await isOwnTeamTherapist(supabase, session.userId, existing.therapist_id))) {
    return { ok: false, error: "Assignment not found." };
  }

  const { data, error } = await supabase
    .from("therapist_child_assignments")
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10) })
    .eq("id", assignmentId)
    .select("id, child_id, therapist_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Assignment not found." };

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.end",
    entityType: "therapist_child_assignment",
    entityId: assignmentId,
    childId: data.child_id,
    metadata: { therapistId: data.therapist_id },
  });

  revalidatePath("/supervisor/assignments");
  return { ok: true };
}
