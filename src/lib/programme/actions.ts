"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { logAuditEvent } from "@/lib/audit/log";

export interface FormState {
  error?: string;
}

async function assertAssigned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  therapistId: string,
  childId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("therapist_child_assignments")
    .select("id")
    .eq("therapist_id", therapistId)
    .eq("child_id", childId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export async function createGoal(
  childId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { error: "Finish setting up your profile first." };

  const title = formData.get("title");
  if (typeof title !== "string" || !title.trim()) return { error: "Please enter a goal title." };

  const description = formData.get("description");
  const domain = formData.get("domain");
  const baselineValue = formData.get("baselineValue");
  const targetValue = formData.get("targetValue");
  const unit = formData.get("unit");

  const supabase = await createClient();
  if (!(await assertAssigned(supabase, therapist.id, childId))) {
    return { error: "You're not assigned to this child." };
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({
      child_id: childId,
      therapist_id: therapist.id,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      domain: typeof domain === "string" && domain.trim() ? domain.trim() : null,
      baseline_value: typeof baselineValue === "string" && baselineValue.trim() ? baselineValue.trim() : null,
      target_value: typeof targetValue === "string" && targetValue.trim() ? targetValue.trim() : null,
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Couldn't add goal." };

  await logAuditEvent({ actor: session, action: "goal.create", entityType: "goal", entityId: data.id, childId });

  revalidatePath(`/therapist/children/${childId}/programme`);
  return {};
}

export async function updateGoalStatus(
  goalId: string,
  status: "active" | "met" | "paused" | "discontinued"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const { data: goal } = await supabase.from("goals").select("child_id").eq("id", goalId).maybeSingle();
  if (!goal) return { ok: false, error: "Goal not found." };
  if (!(await assertAssigned(supabase, therapist.id, goal.child_id))) {
    return { ok: false, error: "You're not assigned to this child." };
  }

  const { data, error } = await supabase
    .from("goals")
    .update({ status, met_on: status === "met" ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", goalId)
    .select("id, child_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Goal not found." };

  await logAuditEvent({ actor: session, action: "goal.update_status", entityType: "goal", entityId: data.id, childId: data.child_id, metadata: { status } });

  revalidatePath(`/therapist/children/${data.child_id}/programme`);
  return { ok: true };
}

export async function createTargetBehaviour(
  childId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { error: "Finish setting up your profile first." };

  const label = formData.get("label");
  const direction = formData.get("direction");
  const measurement = formData.get("measurement");
  if (typeof label !== "string" || !label.trim()) return { error: "Please enter a behaviour label." };
  if (direction !== "increase" && direction !== "decrease") return { error: "Please choose a direction." };
  if (typeof measurement !== "string" || !measurement) return { error: "Please choose how this is measured." };

  const definition = formData.get("definition");
  const parentLabel = formData.get("parentLabel");

  const supabase = await createClient();
  if (!(await assertAssigned(supabase, therapist.id, childId))) {
    return { error: "You're not assigned to this child." };
  }

  const { data, error } = await supabase
    .from("target_behaviours")
    .insert({
      child_id: childId,
      label: label.trim(),
      definition: typeof definition === "string" && definition.trim() ? definition.trim() : null,
      direction,
      measurement,
      parent_label: typeof parentLabel === "string" && parentLabel.trim() ? parentLabel.trim() : null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Couldn't add target behaviour." };

  await logAuditEvent({
    actor: session,
    action: "target_behaviour.create",
    entityType: "target_behaviour",
    entityId: data.id,
    childId,
  });

  revalidatePath(`/therapist/children/${childId}/programme`);
  return {};
}

export async function toggleTargetBehaviourActive(
  behaviourId: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const { data: behaviour } = await supabase
    .from("target_behaviours")
    .select("child_id")
    .eq("id", behaviourId)
    .maybeSingle();
  if (!behaviour) return { ok: false, error: "Behaviour not found." };
  if (!(await assertAssigned(supabase, therapist.id, behaviour.child_id))) {
    return { ok: false, error: "You're not assigned to this child." };
  }

  const { data, error } = await supabase
    .from("target_behaviours")
    .update({ is_active: isActive })
    .eq("id", behaviourId)
    .select("id, child_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Behaviour not found." };

  await logAuditEvent({
    actor: session,
    action: "target_behaviour.toggle_active",
    entityType: "target_behaviour",
    entityId: data.id,
    childId: data.child_id,
    metadata: { isActive },
  });

  revalidatePath(`/therapist/children/${data.child_id}/programme`);
  return { ok: true };
}

export async function createSkill(
  childId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { error: "Finish setting up your profile first." };

  const label = formData.get("label");
  if (typeof label !== "string" || !label.trim()) return { error: "Please enter a skill label." };

  const masteryCriteria = formData.get("masteryCriteria");
  const domainType = formData.get("domainType");
  const validDomainTypes = [
    "name_response",
    "functional_communication",
    "functional_independence",
    "speech_approximation",
    "communicative_initiation",
    "receptive_instructions",
    "object_identification",
    "concept_understanding",
    "tacting_naming",
    "mand_diversity",
    "motor_speech_dttc",
  ];
  const resolvedDomainType =
    typeof domainType === "string" && validDomainTypes.includes(domainType) ? domainType : null;

  const supabase = await createClient();
  if (!(await assertAssigned(supabase, therapist.id, childId))) {
    return { error: "You're not assigned to this child." };
  }

  const { data, error } = await supabase
    .from("skills")
    .insert({
      child_id: childId,
      label: label.trim(),
      mastery_criteria:
        typeof masteryCriteria === "string" && masteryCriteria.trim() ? masteryCriteria.trim() : null,
      domain_type: resolvedDomainType,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Couldn't add skill." };

  await logAuditEvent({ actor: session, action: "skill.create", entityType: "skill", entityId: data.id, childId });

  revalidatePath(`/therapist/children/${childId}/programme`);
  return {};
}

export async function toggleSkillActive(
  skillId: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const { data: skill } = await supabase.from("skills").select("child_id").eq("id", skillId).maybeSingle();
  if (!skill) return { ok: false, error: "Skill not found." };
  if (!(await assertAssigned(supabase, therapist.id, skill.child_id))) {
    return { ok: false, error: "You're not assigned to this child." };
  }

  const { data, error } = await supabase
    .from("skills")
    .update({ is_active: isActive })
    .eq("id", skillId)
    .select("id, child_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Skill not found." };

  await logAuditEvent({
    actor: session,
    action: "skill.toggle_active",
    entityType: "skill",
    entityId: data.id,
    childId: data.child_id,
    metadata: { isActive },
  });

  revalidatePath(`/therapist/children/${data.child_id}/programme`);
  return { ok: true };
}
