-- E11 from the external PRD review: target_behaviours and skills have no
-- owner column at all (deliberate, per migration 0022's own comment, at
-- the time they were written -- "no therapist_id column at all... so
-- 'own-only write' doesn't apply to them"), and their RLS policy is
-- `for all using (is_assigned_therapist(child_id))` with no column or
-- ownership restriction. The app's own UI only ever exposes create and a
-- toggle-active action -- there's no "edit definition" feature to exploit
-- through the UI -- but the RLS layer is permissive enough that any
-- assigned therapist could directly call the API to change another
-- therapist's tracked behaviour's label/definition/direction/measurement
-- (or a skill's mastery criteria/domain type) for a shared child, exactly
-- the "an OT redefines a behaviour and silently corrupts the speech
-- therapist's historical data" scenario the review describes. A full
-- versioned-definition system (the review's literal suggestion) would be
-- speculative engineering for an edit feature that doesn't exist yet --
-- this closes the actually-exploitable gap: attribution, plus restricting
-- writes to the creator, mirroring goals' own ownership split from 0022
-- exactly. Existing rows have no recorded creator (NULL created_by) and
-- stay manageable by any assigned therapist, same as today, rather than
-- retroactively locking out data nobody attributed at creation time.

alter table public.target_behaviours
  add column created_by uuid references public.therapist_profiles(id);
alter table public.skills
  add column created_by uuid references public.therapist_profiles(id);

-- ---------------------------------------------------------------------------
-- target_behaviours
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages target behaviours" on public.target_behaviours;
create policy "assigned therapist views target behaviours" on public.target_behaviours
  for select using (public.is_assigned_therapist(child_id));
create policy "therapist creates own target behaviours" on public.target_behaviours
  for insert with check (
    public.is_assigned_therapist(child_id)
    and exists (select 1 from public.therapist_profiles tp where tp.id = target_behaviours.created_by and tp.user_id = auth.uid())
  );
create policy "therapist manages own target behaviours" on public.target_behaviours
  for update using (
    created_by is null
    or exists (select 1 from public.therapist_profiles tp where tp.id = target_behaviours.created_by and tp.user_id = auth.uid())
  );
create policy "therapist deletes own target behaviours" on public.target_behaviours
  for delete using (
    created_by is null
    or exists (select 1 from public.therapist_profiles tp where tp.id = target_behaviours.created_by and tp.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages skills" on public.skills;
create policy "assigned therapist views skills" on public.skills
  for select using (public.is_assigned_therapist(child_id));
create policy "therapist creates own skills" on public.skills
  for insert with check (
    public.is_assigned_therapist(child_id)
    and exists (select 1 from public.therapist_profiles tp where tp.id = skills.created_by and tp.user_id = auth.uid())
  );
create policy "therapist manages own skills" on public.skills
  for update using (
    created_by is null
    or exists (select 1 from public.therapist_profiles tp where tp.id = skills.created_by and tp.user_id = auth.uid())
  );
create policy "therapist deletes own skills" on public.skills
  for delete using (
    created_by is null
    or exists (select 1 from public.therapist_profiles tp where tp.id = skills.created_by and tp.user_id = auth.uid())
  );
