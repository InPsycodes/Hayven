import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RealAccountInfo {
  fullName: string;
  phone: string | null;
}

export async function getRealAccountInfo(userId: string): Promise<RealAccountInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    fullName: data.full_name,
    phone: data.phone,
  };
}

export interface RealPendingDeletionRequest {
  id: string;
  reason: string | null;
  requestedAt: string;
}

export async function getRealPendingDeletionRequest(userId: string): Promise<RealPendingDeletionRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id, reason, requested_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    reason: data.reason,
    requestedAt: data.requested_at,
  };
}
