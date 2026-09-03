import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export interface ReviewSummary {
  average: number;
  count: number;
}

export interface TherapistReview {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
}

function summarise(rows: { rating: number }[]): ReviewSummary {
  if (rows.length === 0) return { average: 0, count: 0 };
  const total = rows.reduce((sum, r) => sum + r.rating, 0);
  return { average: Math.round((total / rows.length) * 10) / 10, count: rows.length };
}

/** Visible reviews for one therapist, newest first. */
export async function getTherapistReviews(therapistId: string): Promise<TherapistReview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapist_reviews")
    .select("id, rating, body, created_at, hidden")
    .eq("therapist_id", therapistId)
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function getTherapistReviewSummary(therapistId: string): Promise<ReviewSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapist_reviews")
    .select("rating")
    .eq("therapist_id", therapistId)
    .eq("hidden", false);
  return summarise(data ?? []);
}

/** Batched summaries for a list of therapists -- one query for the search page. */
export async function getReviewSummaries(
  therapistIds: string[],
  db?: SupabaseClient
): Promise<Map<string, ReviewSummary>> {
  const out = new Map<string, ReviewSummary>();
  if (therapistIds.length === 0) return out;

  const supabase = db ?? (await createClient());
  const { data } = await supabase
    .from("therapist_reviews")
    .select("therapist_id, rating")
    .in("therapist_id", therapistIds)
    .eq("hidden", false);

  const byTherapist = new Map<string, { rating: number }[]>();
  for (const row of data ?? []) {
    byTherapist.set(row.therapist_id, [...(byTherapist.get(row.therapist_id) ?? []), { rating: row.rating }]);
  }
  for (const id of therapistIds) out.set(id, summarise(byTherapist.get(id) ?? []));
  return out;
}

export interface MyReviewState {
  /** The calling parent's existing review of this therapist, if any. */
  mine: { rating: number; body: string | null } | null;
  /** Whether the parent is allowed to leave one (parent role + a completed session). */
  canReview: boolean;
}

export async function getMyReviewState(therapistId: string): Promise<MyReviewState> {
  const session = await getSession();
  if (!session || session.role !== "parent") return { mine: null, canReview: false };

  const supabase = await createClient();
  const [{ data: existing, error: reviewErr }, { count }] = await Promise.all([
    supabase
      .from("therapist_reviews")
      .select("rating, body")
      .eq("therapist_id", therapistId)
      .eq("parent_id", session.userId)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", session.userId)
      .eq("therapist_id", therapistId)
      .eq("status", "completed"),
  ]);

  // Table not migrated yet -> don't offer a form that can't save.
  if (reviewErr && reviewErr.code === "42P01") return { mine: null, canReview: false };

  return {
    mine: existing ? { rating: existing.rating, body: existing.body } : null,
    canReview: (count ?? 0) > 0,
  };
}
