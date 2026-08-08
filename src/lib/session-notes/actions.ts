"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import type { RealProgressGoal } from "@/lib/session-notes/queries";

export async function addProgressGoal(
  childId: string,
  title: string
): Promise<{ ok: true; goal: RealProgressGoal } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };
  if (!title.trim()) return { ok: false, error: "Goal title can't be empty." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();

  // Defense in depth -- RLS only checks that the inserted row's therapist_id
  // is the caller's own, not that they're actually treating this child.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("child_id", childId)
    .eq("therapist_id", therapist.id)
    .limit(1)
    .maybeSingle();
  if (!booking) return { ok: false, error: "You're not treating this child." };

  const { data, error } = await supabase
    .from("progress_goals")
    .insert({ child_id: childId, therapist_id: therapist.id, title: title.trim() })
    .select("id, title, status")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't add goal." };

  await logAuditEvent({ actor: session, action: "goal.create", entityType: "progress_goal", entityId: data.id, childId });

  return { ok: true, goal: data };
}

export async function submitRealSessionNote(input: {
  bookingId: string;
  summary: string;
  goalsAddressed: string[];
  recommendations: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();

  // Defense in depth -- RLS only checks that the inserted row's therapist_id
  // is the caller's own, not that this booking is actually theirs.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, child_id, children(parent_id, first_name)")
    .eq("id", input.bookingId)
    .eq("therapist_id", therapist.id)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };

  const { data, error } = await supabase
    .from("session_notes")
    .insert({
      booking_id: input.bookingId,
      therapist_id: therapist.id,
      summary: input.summary,
      goals_addressed: input.goalsAddressed,
      recommendations: input.recommendations,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actor: session,
    action: "session_note.create",
    entityType: "session_note",
    entityId: data?.id,
    childId: booking.child_id,
  });

  const child = booking.children as unknown as { parent_id: string; first_name: string } | null;
  if (child) {
    await createNotification({
      userId: child.parent_id,
      type: "note_added",
      title: `New session note for ${child.first_name}`,
      body: `${session.name} shared a progress update after ${child.first_name}'s session.`,
    });
  }

  revalidatePath("/therapist");
  revalidatePath(`/therapist/sessions/${input.bookingId}/report`);
  return { ok: true };
}
