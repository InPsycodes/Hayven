import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface EarningsSummary {
  /** Net naira earned but not yet past the 72h hold. */
  pending: number;
  /** Net naira past the hold, waiting for the next payout run. */
  available: number;
  /** Net naira held while a session is disputed. */
  held: number;
  /** Net naira already paid out. */
  paid: number;
}

export interface EarningRow {
  id: string;
  source: "session" | "retained_cancellation";
  netAmount: number;
  grossAmount: number;
  commissionAmount: number;
  /** Raw ledger status. */
  status: "pending" | "held" | "paid" | "reversed";
  /** Status for display: "pending" that's past the hold shows as "available". */
  displayStatus: "pending" | "available" | "held" | "paid" | "reversed";
  payableAt: string;
  createdAt: string;
  childFirstName: string | null;
}

const ZERO: EarningsSummary = { pending: 0, available: 0, held: 0, paid: 0 };

export async function getEarningsSummary(therapistProfileId: string): Promise<EarningsSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("therapist_earnings")
    .select("net_amount, status, payable_at")
    .eq("therapist_id", therapistProfileId);
  if (error || !data) return ZERO;

  const now = Date.now();
  const out: EarningsSummary = { ...ZERO };
  for (const e of data) {
    if (e.status === "paid") out.paid += e.net_amount;
    else if (e.status === "held") out.held += e.net_amount;
    else if (e.status === "pending") {
      if (new Date(e.payable_at).getTime() <= now) out.available += e.net_amount;
      else out.pending += e.net_amount;
    }
  }
  return out;
}

export async function getEarningRows(therapistProfileId: string): Promise<EarningRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("therapist_earnings")
    .select("id, source, net_amount, gross_amount, commission_amount, status, payable_at, created_at, bookings(children(first_name))")
    .eq("therapist_id", therapistProfileId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];

  const now = Date.now();
  return data.map((e) => ({
    id: e.id,
    source: e.source,
    netAmount: e.net_amount,
    grossAmount: e.gross_amount,
    commissionAmount: e.commission_amount,
    status: e.status,
    displayStatus:
      e.status === "pending" && new Date(e.payable_at).getTime() <= now ? "available" : e.status,
    payableAt: e.payable_at,
    createdAt: e.created_at,
    childFirstName:
      (e.bookings as unknown as { children: { first_name: string } | null } | null)?.children?.first_name ?? null,
  }));
}
