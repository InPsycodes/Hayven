import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RealPaymentRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  childFirstName: string;
  counterpartName: string;
}

/**
 * A parent's session-payment history, newest first. The counterpart's name
 * is resolved via the admin client, same reasoning as
 * getRealMessageThreadsForTherapist in src/lib/messages/queries.ts -- `users`
 * RLS only allows reading your own row, so a raw nested join to the
 * therapist's `users` row silently comes back null (this previously showed
 * "Unknown" for every payment's counterpart on both this page and the
 * therapist's earnings page).
 */
export async function getRealPaymentHistoryForParent(parentId: string): Promise<RealPaymentRecord[]> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, bookings(children(first_name), therapist_profiles(user_id))")
    .eq("payer_id", parentId)
    .eq("type", "session_commission")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data.map((row) => ({
    row,
    booking: row.bookings as unknown as {
      children: { first_name: string } | null;
      therapist_profiles: { user_id: string } | null;
    } | null,
  }));

  const therapistUserIds = [...new Set(rows.map((r) => r.booking?.therapist_profiles?.user_id).filter((id): id is string => Boolean(id)))];
  const { data: therapistRows } = await admin.from("users").select("id, full_name").in("id", therapistUserIds);
  const therapistNameById = new Map((therapistRows ?? []).map((u) => [u.id, u.full_name]));

  return rows.map(({ row, booking }) => ({
    id: row.id,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    childFirstName: booking?.children?.first_name ?? "Unknown",
    counterpartName: (booking?.therapist_profiles?.user_id && therapistNameById.get(booking.therapist_profiles.user_id)) ?? "Therapist",
  }));
}

/** A therapist's earnings history, newest first. Same counterpart-name reasoning as above. */
export async function getRealPaymentHistoryForTherapist(therapistUserId: string): Promise<RealPaymentRecord[]> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, payer_id, bookings(children(first_name))")
    .eq("payee_id", therapistUserId)
    .eq("type", "session_commission")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const payerIds = [...new Set(data.map((row) => row.payer_id).filter((id): id is string => Boolean(id)))];
  const { data: payerRows } = await admin.from("users").select("id, full_name").in("id", payerIds);
  const payerNameById = new Map((payerRows ?? []).map((u) => [u.id, u.full_name]));

  return data.map((row) => {
    const booking = row.bookings as unknown as { children: { first_name: string } | null } | null;
    return {
      id: row.id,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      childFirstName: booking?.children?.first_name ?? "Unknown",
      counterpartName: (row.payer_id && payerNameById.get(row.payer_id)) ?? "Parent",
    };
  });
}
