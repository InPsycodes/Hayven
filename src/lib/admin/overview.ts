import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPendingVerificationCount,
  getPendingDeletionRequestCount,
  getPendingRefundCount,
  getOpenSupportRequestCount,
  getPendingSupervisorRequestCount,
} from "@/lib/admin/queries";
import { getOpenDisputeCount } from "@/lib/disputes/queries";
import { getOpenReferralCount } from "@/lib/referrals/queries";
import { getOpenSafeguardingConcernCount } from "@/lib/safeguarding/queries";

export interface AdminQueue {
  label: string;
  href: string;
  count: number;
  /** created/submitted time of the oldest waiting item, when the queue has one cheaply available. */
  oldestAt: string | null;
}

export interface AdminOverview {
  queues: AdminQueue[];
  /** Open safeguarding concerns marked as immediate danger; only populated for safeguarding leads. */
  urgentSafeguarding: { count: number; oldestAt: string | null } | null;
  money: { nextPayoutDate: string; payoutToday: boolean; clearedNaira: number; heldNaira: number };
  platform: { liveTherapists: number; insuranceEndingSoon: number; sessionsNext7Days: number; waitlist: number };
}

// The Postgrest builder's generic type differs per table; `any` here keeps
// one small helper instead of eight copies.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function oldest(table: string, column: string, filter: (q: any) => any): Promise<string | null> {
  const { data } = await filter(createAdminClient().from(table).select(column)).order(column, { ascending: true }).limit(1);
  const row = (data as Record<string, string>[] | null)?.[0];
  return row ? row[column] : null;
}

/** The next Monday payout run, as YYYY-MM-DD in Lagos time (today if it's Monday). */
function nextPayout(now: Date): { date: string; today: boolean } {
  const lagos = new Date(now.getTime() + 60 * 60 * 1000); // WAT, UTC+1, no DST
  const day = lagos.getUTCDay(); // 1 = Monday
  const daysAhead = (1 - day + 7) % 7;
  const next = new Date(lagos.getTime() + daysAhead * 86_400_000);
  return { date: next.toISOString().slice(0, 10), today: daysAhead === 0 };
}

/**
 * Everything the admin "Today" page shows. Counts reuse the exact queries
 * behind the sidebar badges, so the two can never disagree; the rest are a
 * handful of small service-role reads.
 */
export async function getAdminOverview(isSafeguardingLead: boolean): Promise<AdminOverview> {
  const admin = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const in7 = new Date(now.getTime() + 7 * 86_400_000).toISOString();

  const [
    verification,
    verificationOldest,
    support,
    supportOldest,
    refunds,
    disputes,
    disputesOldest,
    deletions,
    deletionsOldest,
    supervisor,
    supervisorOldest,
    referrals,
    referralsOldest,
    safeguarding,
    urgent,
    cleared,
    held,
    live,
    insurance,
    upcoming,
    waitlist,
  ] = await Promise.all([
    getPendingVerificationCount(),
    oldest("verification_requests", "submitted_at", (q) => q.in("status", ["submitted", "in_review"])),
    getOpenSupportRequestCount(),
    oldest("support_requests", "created_at", (q) => q.eq("status", "open")),
    getPendingRefundCount(),
    getOpenDisputeCount(),
    oldest("booking_disputes", "created_at", (q) => q.eq("status", "open")),
    getPendingDeletionRequestCount(),
    oldest("account_deletion_requests", "requested_at", (q) => q.eq("status", "pending")),
    getPendingSupervisorRequestCount(),
    oldest("supervisor_requests", "requested_at", (q) => q.eq("status", "pending")),
    getOpenReferralCount(),
    oldest("referrals", "created_at", (q) => q.neq("status", "care_started")),
    isSafeguardingLead ? getOpenSafeguardingConcernCount() : Promise.resolve(0),
    isSafeguardingLead
      ? admin
          .from("safeguarding_concerns")
          .select("created_at")
          .eq("immediate_danger", true)
          .neq("status", "closed")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
    admin.from("therapist_earnings").select("net_amount").eq("status", "pending").lte("payable_at", now.toISOString()),
    admin.from("therapist_earnings").select("net_amount").eq("status", "held"),
    admin.from("therapist_public_profiles").select("id", { count: "exact", head: true }),
    // Latest cover per therapist decides "ending soon"; a therapist who has
    // already uploaded a renewal past the window isn't counted.
    admin.from("credentials").select("therapist_id, expires_on").eq("document_type", "insurance").not("expires_on", "is", null),
    admin
      .from("bookings")
      .select("id, availability_slots!inner(start_time)", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("availability_slots.start_time", now.toISOString())
      .lte("availability_slots.start_time", in7),
    // Pre-0107 the table is missing; count comes back null and reads as 0.
    admin.from("launch_waitlist").select("id", { count: "exact", head: true }).is("notified_at", null),
  ]);

  const latestCover = new Map<string, string>();
  for (const row of (insurance.data ?? []) as { therapist_id: string; expires_on: string }[]) {
    const prev = latestCover.get(row.therapist_id);
    if (!prev || row.expires_on > prev) latestCover.set(row.therapist_id, row.expires_on);
  }
  const insuranceEndingSoon = [...latestCover.values()].filter((d) => d > today && d <= in30).length;

  const sum = (rows: { net_amount: number }[] | null) => (rows ?? []).reduce((total, r) => total + r.net_amount, 0);
  const urgentRows = (urgent.data ?? []) as { created_at: string }[];
  const payout = nextPayout(now);

  const queues: AdminQueue[] = [
    ...(isSafeguardingLead
      ? [{ label: "Safeguarding", href: "/admin/safeguarding", count: safeguarding, oldestAt: null }]
      : []),
    { label: "Verification", href: "/admin/verification", count: verification, oldestAt: verificationOldest },
    { label: "Support", href: "/admin/support", count: support, oldestAt: supportOldest },
    { label: "Refunds", href: "/admin/refunds", count: refunds, oldestAt: null },
    { label: "Disputes", href: "/admin/disputes", count: disputes, oldestAt: disputesOldest },
    { label: "Referrals", href: "/admin/referrals", count: referrals, oldestAt: referralsOldest },
    { label: "Supervisor requests", href: "/admin/users", count: supervisor, oldestAt: supervisorOldest },
    { label: "Deletion requests", href: "/admin/deletion-requests", count: deletions, oldestAt: deletionsOldest },
  ];

  return {
    queues,
    urgentSafeguarding: isSafeguardingLead
      ? { count: urgentRows.length, oldestAt: urgentRows[0]?.created_at ?? null }
      : null,
    money: {
      nextPayoutDate: payout.date,
      payoutToday: payout.today,
      clearedNaira: sum(cleared.data as { net_amount: number }[] | null),
      heldNaira: sum(held.data as { net_amount: number }[] | null),
    },
    platform: {
      liveTherapists: live.count ?? 0,
      insuranceEndingSoon,
      sessionsNext7Days: upcoming.count ?? 0,
      waitlist: waitlist.count ?? 0,
    },
  };
}
