import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The TS-callable equivalent of is_assigned_therapist() (0011, extended by
 * 0086 to also require the child's therapist_access consent not be
 * explicitly revoked). That Postgres function relies on auth.uid(), which
 * is null under the service-role client, so admin-client code that needs
 * the identical check for an explicit therapist id can't just RPC into it.
 *
 * Kept in exactly one place on purpose: this is the second time a
 * hand-rolled "is this therapist actively assigned" check has drifted out
 * of sync with the real rule. getConfidentialNote, getCareTeamForChild, and
 * getFullChildProgramme's goal-attribution query each independently
 * re-implemented "active assignment row exists" and none of them picked up
 * the consent requirement when 0086 shipped -- a therapist whose access had
 * been explicitly revoked by the parent could still read the confidential
 * note, the care-team roster, and attributed goals through those three
 * admin-client paths, even though the exact same request through RLS
 * (goals, therapy_sessions, reports) was correctly blocked. Every caller
 * that needs this check should use this function instead of re-deriving it.
 */
export async function isTherapistAuthorizedForChild(
  childId: string,
  therapistProfileId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: assignment }, { data: consentRow }] = await Promise.all([
    admin
      .from("therapist_child_assignments")
      .select("id")
      .eq("child_id", childId)
      .eq("therapist_id", therapistProfileId)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("intake_consents")
      .select("granted")
      .eq("child_id", childId)
      .eq("consent_type", "therapist_access")
      .order("recorded_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!assignment) return false;
  return consentRow?.granted !== false;
}
