import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { MIN_PAYOUT_NAIRA } from "@/lib/payouts/commission";

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

// --- admin ---------------------------------------------------------------

export interface PayoutPreviewRow {
  therapistId: string;
  name: string;
  clearedNaira: number;
  earningCount: number;
  hasBank: boolean;
  eligible: boolean;
}

/** Every therapist with cleared, unpaid earnings -- what a payout run would do. */
export async function getPayoutPreview(): Promise<PayoutPreviewRow[]> {
  const admin = createAdminClient();
  const { data: earnings, error } = await admin
    .from("therapist_earnings")
    .select("therapist_id, net_amount")
    .eq("status", "pending")
    .is("payout_id", null)
    .lte("payable_at", new Date().toISOString());
  if (error || !earnings || earnings.length === 0) return [];

  const byTherapist = new Map<string, { total: number; count: number }>();
  for (const e of earnings) {
    const g = byTherapist.get(e.therapist_id) ?? { total: 0, count: 0 };
    g.total += e.net_amount;
    g.count += 1;
    byTherapist.set(e.therapist_id, g);
  }

  const ids = [...byTherapist.keys()];
  const { data: profiles } = await admin
    .from("therapist_profiles")
    .select("id, bank_account_number, users(full_name)")
    .in("id", ids);
  const profById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return ids
    .map((id) => {
      const g = byTherapist.get(id)!;
      const p = profById.get(id);
      const hasBank = !!p?.bank_account_number;
      return {
        therapistId: id,
        name: (p?.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
        clearedNaira: g.total,
        earningCount: g.count,
        hasBank,
        eligible: hasBank && g.total >= MIN_PAYOUT_NAIRA,
      };
    })
    .sort((a, b) => b.clearedNaira - a.clearedNaira);
}

export interface PayoutHistoryRow {
  id: string;
  therapistName: string;
  amount: number;
  earningCount: number;
  status: "pending" | "processing" | "paid" | "failed";
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

export async function getPayoutHistory(limit = 50): Promise<PayoutHistoryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payouts")
    .select("id, amount, earning_count, status, failure_reason, created_at, paid_at, therapist_profiles(users(full_name))")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    therapistName:
      (p.therapist_profiles as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ??
      "Unknown",
    amount: p.amount,
    earningCount: p.earning_count,
    status: p.status,
    failureReason: p.failure_reason,
    createdAt: p.created_at,
    paidAt: p.paid_at,
  }));
}

export interface BankDetails {
  bankCode: string;
  accountNumberMasked: string;
  accountName: string;
}

/**
 * The therapist's saved payout bank account. Resilient to a pre-0074 DB.
 *
 * bank_account_number/bank_code/bank_account_name are select-revoked from
 * `authenticated` and `anon` entirely (0084) -- they were previously
 * reachable by anyone via the regular client, since RLS is row-level and
 * can't restrict columns. Same pattern as getConfidentialNote: read via the
 * service-role client, then independently re-verify the caller actually
 * owns this profile before returning anything.
 */
export async function getBankDetails(therapistProfileId: string): Promise<BankDetails | null> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("therapist_profiles")
    .select("user_id, bank_code, bank_account_number, bank_account_name")
    .eq("id", therapistProfileId)
    .maybeSingle();
  if (error || !data || data.user_id !== session.userId || !data.bank_account_number) return null;

  const num = String(data.bank_account_number);
  return {
    bankCode: data.bank_code ?? "",
    accountNumberMasked: num.length > 4 ? `••••${num.slice(-4)}` : num,
    accountName: data.bank_account_name ?? "",
  };
}
