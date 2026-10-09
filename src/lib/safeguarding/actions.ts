"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { isSafeguardingLead } from "./leads";
import { notifySafeguardingLeads } from "./alerts";
import {
  DECISION_LABELS,
  STATUS_LABELS,
  type SafeguardingConcernDecision,
  type SafeguardingConcernStatus,
} from "./types";

export interface RaiseConcernState {
  error?: string;
  ok?: boolean;
}

const MAX_DESCRIPTION = 5000;
const MAX_NOTE = 5000;

/**
 * Procedure §4: a therapist (or supervisor -- they're therapists too) logs
 * a concern straight to the DSL. Distinct from support on purpose: it
 * lands in the safeguarding log, never the support queue every admin sees.
 *
 * The child picker offers any child the therapist has *ever* been assigned
 * to, not just current ones -- a concern can surface after an assignment
 * ends or consent is withdrawn, and that must not block raising it.
 */
export async function raiseSafeguardingConcern(
  _prev: RaiseConcernState,
  formData: FormData
): Promise<RaiseConcernState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist to raise a concern here." };
  }

  // Generous on purpose: blocking a genuine concern is the worse failure.
  const rateLimitOk = await checkRateLimit(`safeguarding_concern:${session.userId}`, 20, 60 * 60);
  if (!rateLimitOk) {
    return { error: "You've logged a lot of concerns in the last hour. Please phone the DSL directly instead." };
  }

  const description = formData.get("description");
  const childIdRaw = formData.get("childId");
  const immediateDanger = formData.get("immediateDanger") === "on";

  if (typeof description !== "string" || !description.trim()) {
    return { error: "Please describe what you saw or heard." };
  }
  if (description.length > MAX_DESCRIPTION) {
    return { error: `Please keep this under ${MAX_DESCRIPTION} characters. The DSL will follow up for more.` };
  }

  const admin = createAdminClient();
  let childId: string | null = null;
  if (typeof childIdRaw === "string" && childIdRaw) {
    const therapist = await getRealTherapistProfileByUserId(session.userId);
    if (!therapist) return { error: "Finish setting up your profile first." };
    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("id")
      .eq("therapist_id", therapist.id)
      .eq("child_id", childIdRaw)
      .limit(1)
      .maybeSingle();
    if (!assignment) return { error: "That child isn't on your caseload." };
    childId = childIdRaw;
  }

  const { data: concern, error } = await admin
    .from("safeguarding_concerns")
    .insert({
      source: "staff_report",
      raised_by: session.userId,
      child_id: childId,
      immediate_danger: immediateDanger,
      description: description.trim(),
    })
    .select("id")
    .single();
  if (error || !concern) {
    return { error: "Couldn't log this concern. Please phone the DSL directly now." };
  }

  await admin.from("safeguarding_concern_events").insert({
    concern_id: concern.id,
    actor_id: session.userId,
    kind: "raised",
    note: immediateDanger ? "Raised, marked as immediate danger." : "Raised.",
  });
  await logAuditEvent({
    actor: session,
    action: "safeguarding_concern.raise",
    entityType: "safeguarding_concern",
    entityId: concern.id,
  });
  await notifySafeguardingLeads(concern.id, immediateDanger);

  revalidatePath("/therapist/safeguarding");
  return { ok: true };
}

const STATUSES: SafeguardingConcernStatus[] = ["open", "monitoring", "referred", "closed"];
const DECISIONS: SafeguardingConcernDecision[] = [
  "monitor",
  "contact_family",
  "refer_externally",
  "immediate_escalation",
  "no_action",
];

/**
 * Procedure §5.2/§5.4: the DSL records the decision, the reasoning, a
 * review date, and the outcome. Every change appends an event, so the
 * record shows what changed when and who changed it, not only the latest state.
 * Closing a staff-raised concern tells the raiser it was actioned (no detail).
 */
export async function updateSafeguardingConcern(
  concernId: string,
  input: {
    status: SafeguardingConcernStatus;
    decision: SafeguardingConcernDecision | null;
    decisionReasoning: string;
    reviewDate: string | null;
    outcome: string;
    note: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!(await isSafeguardingLead(session)) || !session) {
    return { ok: false, error: "Only the safeguarding leads can update a concern." };
  }

  if (!STATUSES.includes(input.status)) return { ok: false, error: "Unknown status." };
  if (input.decision !== null && !DECISIONS.includes(input.decision)) return { ok: false, error: "Unknown decision." };
  if (input.reviewDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.reviewDate)) {
    return { ok: false, error: "Review date must be a date." };
  }
  if ([input.decisionReasoning, input.outcome, input.note].some((t) => t.length > MAX_NOTE)) {
    return { ok: false, error: `Please keep each field under ${MAX_NOTE} characters.` };
  }
  if (input.decision && !input.decisionReasoning.trim()) {
    return { ok: false, error: "Record the reasoning for the decision (procedure §5.2)." };
  }
  if (input.status === "closed" && !input.decision) {
    return { ok: false, error: "Record a decision before closing the concern." };
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("safeguarding_concerns")
    .select("status, decision, raised_by, closed_at")
    .eq("id", concernId)
    .maybeSingle();
  if (!before) return { ok: false, error: "Concern not found." };

  const now = new Date().toISOString();
  const { error } = await admin
    .from("safeguarding_concerns")
    .update({
      status: input.status,
      decision: input.decision,
      decision_reasoning: input.decisionReasoning.trim() || null,
      review_date: input.reviewDate,
      outcome: input.outcome.trim() || null,
      handled_by: session.userId,
      updated_at: now,
      closed_at: input.status === "closed" ? (before.closed_at ?? now) : null,
    })
    .eq("id", concernId);
  if (error) return { ok: false, error: error.message };

  const changes: string[] = [];
  if (before.status !== input.status) changes.push(`Status: ${STATUS_LABELS[input.status]}`);
  if (before.decision !== input.decision && input.decision) changes.push(`Decision: ${DECISION_LABELS[input.decision]}`);
  const summary = [changes.join(". "), input.note.trim()].filter(Boolean).join(" | ");
  await admin.from("safeguarding_concern_events").insert({
    concern_id: concernId,
    actor_id: session.userId,
    kind: "updated",
    note: summary || "Record updated.",
  });
  await logAuditEvent({
    actor: session,
    action: "safeguarding_concern.update",
    entityType: "safeguarding_concern",
    entityId: concernId,
    metadata: { status: input.status },
  });

  // §5.4 close the loop -- once, on the first move out of "open".
  if (before.status === "open" && input.status !== "open" && before.raised_by) {
    await createNotification({
      userId: before.raised_by,
      type: "safeguarding_concern_actioned",
      title: "Your safeguarding concern has been actioned",
      body: "Thank you for raising it. The safeguarding lead has reviewed it and acted. Contact them directly if anything changes.",
      url: "/therapist/safeguarding",
    });
  }

  revalidatePath("/admin/safeguarding");
  revalidatePath(`/admin/safeguarding/${concernId}`);
  return { ok: true };
}
