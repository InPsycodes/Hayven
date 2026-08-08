import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RealPaymentRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  childFirstName: string;
  counterpartName: string;
}

/** A parent's session-payment history, newest first. */
export async function getRealPaymentHistoryForParent(parentId: string): Promise<RealPaymentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, bookings(children(first_name), therapist_profiles(users(full_name)))")
    .eq("payer_id", parentId)
    .eq("type", "session_commission")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const booking = row.bookings as unknown as {
      children: { first_name: string } | null;
      therapist_profiles: { users: { full_name: string } | null } | null;
    } | null;
    return {
      id: row.id,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      childFirstName: booking?.children?.first_name ?? "Unknown",
      counterpartName: booking?.therapist_profiles?.users?.full_name ?? "Unknown",
    };
  });
}

/** A therapist's earnings history, newest first. */
export async function getRealPaymentHistoryForTherapist(therapistUserId: string): Promise<RealPaymentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, bookings(children(first_name)), users!payer_id(full_name)")
    .eq("payee_id", therapistUserId)
    .eq("type", "session_commission")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const booking = row.bookings as unknown as { children: { first_name: string } | null } | null;
    const payer = row.users as unknown as { full_name: string } | null;
    return {
      id: row.id,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      childFirstName: booking?.children?.first_name ?? "Unknown",
      counterpartName: payer?.full_name ?? "Unknown",
    };
  });
}
