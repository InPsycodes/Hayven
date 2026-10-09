import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MyRaisedConcern,
  SafeguardingConcernDetail,
  SafeguardingConcernSummary,
} from "./types";

// Every function here uses the service-role client -- the safeguarding
// tables have no grant to `authenticated` at all (0104). Callers must have
// already checked isSafeguardingLead (admin views) or scoped to the
// caller's own user id (getMyRaisedConcerns); nothing here re-checks.

type Named = { full_name: string } | null;
type ChildRef = { first_name: string } | null;

export async function getSafeguardingConcerns(): Promise<SafeguardingConcernSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("safeguarding_concerns")
    .select(
      "id, source, status, immediate_danger, description, review_date, created_at, children(first_name), raiser:users!safeguarding_concerns_raised_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  // Open and in-progress concerns first, newest first within each group.
  const rank = { open: 0, monitoring: 1, referred: 1, closed: 2 } as const;
  return data
    .map((row) => ({
      id: row.id,
      source: row.source,
      status: row.status,
      immediateDanger: row.immediate_danger,
      childFirstName: (row.children as unknown as ChildRef)?.first_name ?? null,
      raisedByName: (row.raiser as unknown as Named)?.full_name ?? null,
      descriptionPreview: row.description.length > 160 ? `${row.description.slice(0, 160)}…` : row.description,
      reviewDate: row.review_date,
      createdAt: row.created_at,
    }))
    .sort((a, b) => rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank]);
}

export async function getOpenSafeguardingConcernCount(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("safeguarding_concerns")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return error ? 0 : (count ?? 0);
}

export async function getSafeguardingConcern(id: string): Promise<SafeguardingConcernDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("safeguarding_concerns")
    .select(
      "id, source, status, immediate_danger, description, matched_phrases, decision, decision_reasoning, review_date, outcome, created_at, closed_at, child_id, therapy_session_id, children(first_name), raiser:users!safeguarding_concerns_raised_by_fkey(full_name), handler:users!safeguarding_concerns_handled_by_fkey(full_name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;

  const { data: events } = await admin
    .from("safeguarding_concern_events")
    .select("id, kind, note, created_at, actor:users(full_name)")
    .eq("concern_id", id)
    .order("created_at", { ascending: true });

  return {
    id: row.id,
    source: row.source,
    status: row.status,
    immediateDanger: row.immediate_danger,
    childId: row.child_id,
    childFirstName: (row.children as unknown as ChildRef)?.first_name ?? null,
    therapySessionId: row.therapy_session_id,
    raisedByName: (row.raiser as unknown as Named)?.full_name ?? null,
    description: row.description,
    matchedPhrases: row.matched_phrases ?? [],
    decision: row.decision,
    decisionReasoning: row.decision_reasoning,
    reviewDate: row.review_date,
    outcome: row.outcome,
    handledByName: (row.handler as unknown as Named)?.full_name ?? null,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    events: (events ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      note: e.note,
      actorName: (e.actor as unknown as Named)?.full_name ?? null,
      createdAt: e.created_at,
    })),
  };
}

/** Every child the therapist has ever been assigned to, current or ended -- the same set raiseSafeguardingConcern accepts. */
export async function getRaisableChildren(therapistProfileId: string): Promise<{ id: string; firstName: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("therapist_child_assignments")
    .select("children(id, first_name)")
    .eq("therapist_id", therapistProfileId);
  const byId = new Map<string, string>();
  for (const row of data ?? []) {
    const child = row.children as unknown as { id: string; first_name: string } | null;
    if (child) byId.set(child.id, child.first_name);
  }
  return [...byId].map(([id, firstName]) => ({ id, firstName })).sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export async function getMyRaisedConcerns(userId: string): Promise<MyRaisedConcern[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("safeguarding_concerns")
    .select("id, status, decision, created_at, children(first_name)")
    .eq("raised_by", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    childFirstName: (row.children as unknown as ChildRef)?.first_name ?? null,
    createdAt: row.created_at,
    actioned: row.status !== "open" || row.decision !== null,
  }));
}
