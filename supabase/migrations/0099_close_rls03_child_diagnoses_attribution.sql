-- RLS-03 fix (pre-launch audit, P2): child_diagnoses never got the
-- owner-scoped write split every sibling clinical table has (0022's
-- goals/reports split, 0031/0050's therapy_sessions family, 0087's
-- target_behaviours/skills) -- "assigned therapist manages child
-- diagnoses" is still `for all using (is_assigned_therapist(child_id))`,
-- so any therapist sharing a case (e.g. a newly-added speech therapist)
-- can edit or delete a diagnosis entered by a different clinician for that
-- child, with zero attribution trail. Diagnosis labels/codes are more
-- clinically/legally sensitive than the behaviour-tracking data 0087
-- already closed this exact gap for.
--
-- Same shape as 0087 exactly: add created_by, split into shared-read +
-- author-scoped write, existing rows (NULL created_by) stay manageable by
-- any assigned therapist rather than retroactively locking out data nobody
-- attributed at creation time. The parent-facing "parent manages own child
-- diagnoses" policy is untouched -- out of scope for this finding, which is
-- about therapist-to-therapist attribution.

alter table public.child_diagnoses
  add column created_by uuid references public.therapist_profiles(id);

drop policy "assigned therapist manages child diagnoses" on public.child_diagnoses;
create policy "assigned therapist views child diagnoses" on public.child_diagnoses
  for select using (public.is_assigned_therapist(child_id));
create policy "therapist creates own child diagnoses" on public.child_diagnoses
  for insert with check (
    public.is_assigned_therapist(child_id)
    and exists (select 1 from public.therapist_profiles tp where tp.id = child_diagnoses.created_by and tp.user_id = auth.uid())
  );
create policy "therapist manages own child diagnoses" on public.child_diagnoses
  for update using (
    created_by is null
    or exists (select 1 from public.therapist_profiles tp where tp.id = child_diagnoses.created_by and tp.user_id = auth.uid())
  );
create policy "therapist deletes own child diagnoses" on public.child_diagnoses
  for delete using (
    created_by is null
    or exists (select 1 from public.therapist_profiles tp where tp.id = child_diagnoses.created_by and tp.user_id = auth.uid())
  );
