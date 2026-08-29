-- Real intake form: the homepage has promised "from your first intake form
-- to booking" since launch, and the parent-dashboard preview mockup has
-- always shown a "Sensory profile / Medical history / Consent & sharing /
-- Home routine survey" checklist -- neither ever had a real feature behind
-- it. This is that feature: one form per child, filled in by the parent,
-- readable by whichever therapist is actually assigned to that child so
-- they walk into the first session with real context, matching what the
-- marketing copy already promised.
--
-- One row per child (not per booking) -- sensory profile / medical history
-- don't change per session, and re-collecting them per booking would be
-- exactly the kind of repeat-yourself friction Hayven is positioned against.
--
-- Reuses is_parent_of_child() / is_assigned_therapist() from
-- 0011_progress_reports_rls.sql instead of redefining the same checks.

create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children(id) on delete cascade,
  sensory_profile text,
  medical_history text,
  consent_sharing text,
  home_routine text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.intake_forms enable row level security;

create policy "parent manages own child intake form" on public.intake_forms
  for all using (public.is_parent_of_child(child_id))
  with check (public.is_parent_of_child(child_id));

create policy "assigned therapist reads intake form" on public.intake_forms
  for select using (public.is_assigned_therapist(child_id));

create policy "admins manage all intake forms" on public.intake_forms
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Table-wide grant, same shape as every other RLS-gated table in this
-- codebase: the grant makes the command reachable, the policy above
-- decides whether a given row actually allows it (a therapist can SELECT
-- but has no INSERT/UPDATE policy, so the grant alone doesn't let them write).
grant select, insert, update on public.intake_forms to authenticated;
grant all privileges on public.intake_forms to service_role;
