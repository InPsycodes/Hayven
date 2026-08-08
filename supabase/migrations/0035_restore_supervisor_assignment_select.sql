-- Bug fix for 0032, caught by live testing: splitting the original combined
-- "supervisor manages team assignments" (for all) policy into separate
-- insert/update/delete policies dropped SELECT visibility entirely -- no
-- replacement select policy was ever added. Two consequences:
--
-- 1. Real regression: getMyTeamAssignments, getSupervisedChildrenForTherapist,
--    and getSupervisedChildById (src/lib/supervisor/queries.ts) all query
--    therapist_child_assignments directly via the regular client and would
--    now return nothing for any supervisor, breaking the whole
--    /supervisor/assignments page and child-detail lookups.
-- 2. Misleading test symptom: inserting with Prefer: return=representation
--    (PostgREST's insert...returning) failed with a WITH-CHECK-shaped 42501
--    even when the insert's own logic was correct, because the RETURNING
--    read-back is itself subject to the SELECT policy.
--
-- Read-only visibility into your own supervised team was never the risky
-- part of any of this -- only creating new arbitrary assignments was --
-- so this is a plain restore, scoped the same way inserts already are.

create policy "supervisor views team assignments" on public.therapist_child_assignments
  for select using (public.is_supervisor_of_therapist(therapist_id));
