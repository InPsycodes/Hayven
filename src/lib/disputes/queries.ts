import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type DisputeStatus = "open" | "resolved";
export type DisputeResolution = "full_refund" | "partial_refund" | "no_action";

export interface MyDispute {
  id: string;
  status: DisputeStatus;
  reason: string;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  refundAmount: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** The parent's dispute for a booking, if any. Resilient to a pre-0072 DB. */
export async function getMyDisputeForBooking(bookingId: string): Promise<MyDispute | null> {
  const session = await getSession();
  if (!session) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_disputes")
    .select("id, status, reason, resolution, resolution_note, refund_amount, created_at, resolved_at")
    .eq("booking_id", bookingId)
    .eq("parent_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    status: data.status,
    reason: data.reason,
    resolution: data.resolution,
    resolutionNote: data.resolution_note,
    refundAmount: data.refund_amount,
    createdAt: data.created_at,
    resolvedAt: data.resolved_at,
  };
}

/** Bookings (of this parent) that have a dispute, keyed by booking id. */
export async function getMyDisputesByBooking(bookingIds: string[]): Promise<Map<string, MyDispute>> {
  const out = new Map<string, MyDispute>();
  if (bookingIds.length === 0) return out;
  const session = await getSession();
  if (!session) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_disputes")
    .select("id, booking_id, status, reason, resolution, resolution_note, refund_amount, created_at, resolved_at")
    .in("booking_id", bookingIds)
    .eq("parent_id", session.userId);
  if (error) return out;
  for (const d of data ?? []) {
    out.set(d.booking_id, {
      id: d.id,
      status: d.status,
      reason: d.reason,
      resolution: d.resolution,
      resolutionNote: d.resolution_note,
      refundAmount: d.refund_amount,
      createdAt: d.created_at,
      resolvedAt: d.resolved_at,
    });
  }
  return out;
}

export interface AdminDispute {
  id: string;
  bookingId: string;
  reason: string;
  createdAt: string;
  parentName: string;
  parentEmail: string;
  childFirstName: string;
  therapistName: string;
  sessionDate: string | null;
  bookingStatus: string;
  amountPaid: number | null;
}

export async function getOpenDisputes(): Promise<AdminDispute[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_disputes")
    .select(
      "id, booking_id, reason, created_at, users!parent_id(full_name, email), bookings(status, availability_slots(start_time), children(first_name), therapist_profiles(users(full_name)), payments(amount, status, type))"
    )
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  return data.map((row) => {
    const parent = row.users as unknown as { full_name: string; email: string } | null;
    const booking = row.bookings as unknown as {
      status: string;
      availability_slots: { start_time: string } | null;
      children: { first_name: string } | null;
      therapist_profiles: { users: { full_name: string } | null } | null;
      payments: { amount: number; status: string; type: string }[] | null;
    } | null;
    const paid = (booking?.payments ?? []).find(
      (p) => p.status === "successful" && p.type === "session_commission"
    );
    return {
      id: row.id,
      bookingId: row.booking_id,
      reason: row.reason,
      createdAt: row.created_at,
      parentName: parent?.full_name ?? "Unknown",
      parentEmail: parent?.email ?? "",
      childFirstName: booking?.children?.first_name ?? "Unknown",
      therapistName: booking?.therapist_profiles?.users?.full_name ?? "Unknown",
      sessionDate: booking?.availability_slots?.start_time ?? null,
      bookingStatus: booking?.status ?? "unknown",
      amountPaid: paid?.amount ?? null,
    };
  });
}

export async function getOpenDisputeCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("booking_disputes")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}
