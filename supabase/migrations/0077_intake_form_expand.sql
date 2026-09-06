-- Expands the intake form (0058) from four free-text columns into the
-- eight-section structured form: an opaque `details` jsonb for the bulk of
-- the answers (checklists, segmented picks, per-field text -- validated
-- shape-wise in src/lib/intake, never queried by individual key), plus a
-- separate `intake_consents` history table so a parent can change a consent
-- and the previous decision is still on record with its timestamp.
--
-- The four original columns are kept (nullable, unused by the app after
-- this) so no data is lost; their content is folded into `details` below.
-- A later migration can drop them once the new form is confirmed in use.

alter table public.intake_forms
  add column if not exists details jsonb not null default '{}'::jsonb,
  -- One-time, set when the assigned therapist(s) are first told the form is
  -- substantially filled in, so the notification never repeats.
  add column if not exists therapist_notified_at timestamptz;

-- Fold the old free text into the closest new field. sensory_profile was a
-- catch-all "what soothes / overwhelms them" box -> sensoryCalming;
-- medical_history -> diagnoses; home_routine -> routineHardest;
-- consent_sharing (a free-text "who's involved and what's ok to share")
-- -> the share_named consent detail, recorded below.
update public.intake_forms
set details = jsonb_strip_nulls(
  jsonb_build_object(
    'sensoryCalming', nullif(sensory_profile, ''),
    'diagnoses', nullif(medical_history, ''),
    'routineHardest', nullif(home_routine, '')
  )
)
where details = '{}'::jsonb
  and (sensory_profile is not null or medical_history is not null or home_routine is not null);

-- ---------------------------------------------------------------------------
-- intake_consents -- append-only history, one row per (child, consent_type)
-- change. The current state of a consent is its most recent row.
-- ---------------------------------------------------------------------------

create table if not exists public.intake_consents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  consent_type text not null check (consent_type in (
    'therapist_access', 'share_named', 'session_media', 'anon_data'
  )),
  granted boolean not null,
  -- Only used by 'share_named': the people updates may be shared with.
  detail text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid not null references public.users(id)
);

create index if not exists intake_consents_child_type_idx
  on public.intake_consents (child_id, consent_type, recorded_at desc);

alter table public.intake_consents enable row level security;

-- Same access shape as intake_forms itself (0058): the parent of the child
-- manages it, the assigned therapist and admins read it. Reuses
-- is_parent_of_child / is_assigned_therapist from 0011.
create policy "parent manages own child intake consents" on public.intake_consents
  for all using (public.is_parent_of_child(child_id))
  with check (public.is_parent_of_child(child_id));

create policy "assigned therapist reads intake consents" on public.intake_consents
  for select using (public.is_assigned_therapist(child_id));

create policy "admins manage all intake consents" on public.intake_consents
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

grant select, insert on public.intake_consents to authenticated;
grant all privileges on public.intake_consents to service_role;

-- Carry the old consent_sharing free text over as the first share_named
-- consent record, so nothing a parent already told us is dropped. Attributed
-- to the child's own parent.
insert into public.intake_consents (child_id, consent_type, granted, detail, recorded_by)
select f.child_id, 'share_named', true, f.consent_sharing, c.parent_id
from public.intake_forms f
join public.children c on c.id = f.child_id
where f.consent_sharing is not null and f.consent_sharing <> ''
  and not exists (
    select 1 from public.intake_consents ic
    where ic.child_id = f.child_id and ic.consent_type = 'share_named'
  );
