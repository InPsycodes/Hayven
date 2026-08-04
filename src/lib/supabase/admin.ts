import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client -- bypasses RLS and column grants entirely. Only for
 * server-only admin code (e.g. reading verification_requests.reviewer_notes,
 * approving/rejecting therapists). Never import this into a Client Component
 * or anything that ships to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
