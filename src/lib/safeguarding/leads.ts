import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSession } from "@/lib/auth/session";

/**
 * Who handles safeguarding concerns: the accounts in safeguarding_leads
 * (migration 0104), i.e. the DSL and Deputy DSL. Until at least one is
 * designated, every admin -- a concern must never be raised into a void,
 * and before designation the only admin is the founder, who is the DSL.
 *
 * Leads must also be admins: the /admin/safeguarding pages sit behind the
 * admin layout (and its MFA requirement), so a non-admin lead row is
 * ignored rather than half-working.
 */
export async function getSafeguardingLeadIds(): Promise<{ ids: string[]; designated: boolean }> {
  const admin = createAdminClient();
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  const adminIds = new Set((admins ?? []).map((a) => a.id as string));

  const { data: leads, error } = await admin.from("safeguarding_leads").select("user_id");
  // Pre-0104 database or no rows yet -> fall back to every admin.
  const leadIds = error ? [] : (leads ?? []).map((l) => l.user_id as string).filter((id) => adminIds.has(id));
  if (leadIds.length > 0) return { ids: leadIds, designated: true };
  return { ids: [...adminIds], designated: false };
}

/** The check every safeguarding read and decision goes through -- the tables have no RLS policies at all, so this is the only gate. */
export async function isSafeguardingLead(session: AppSession | null): Promise<boolean> {
  if (!session || session.role !== "admin") return false;
  const { ids } = await getSafeguardingLeadIds();
  return ids.includes(session.userId);
}
