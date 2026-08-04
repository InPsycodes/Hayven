"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
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
  const { data, error } = await supabase
    .from("progress_goals")
    .insert({ child_id: childId, therapist_id: therapist.id, title: title.trim() })
    .select("id, title, status")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't add goal." };

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
  const { error } = await supabase.from("session_notes").insert({
    booking_id: input.bookingId,
    therapist_id: therapist.id,
    summary: input.summary,
    goals_addressed: input.goalsAddressed,
    recommendations: input.recommendations,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/therapist");
  revalidatePath(`/therapist/sessions/${input.bookingId}/report`);
  return { ok: true };
}
