-- Structured clinical-report domains: additive support for domain-typed
-- skills (Name Response, Functional Communication, Functional Independence,
-- with more addable later as pure config, no schema change) plus a
-- repeatable ABC-observation builder. Nothing here changes behaviour for
-- existing skills/behaviours with no domain_type set -- they keep reading
-- and generating exactly as before.

alter table public.skills
  add column domain_type text;

alter table public.session_skill_entries
  add column structured_data jsonb;

alter table public.therapy_sessions
  add column attendance text,
  add column general_presentation text;

create table public.session_abc_observations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.therapy_sessions(id) on delete cascade,
  behaviour_label text not null,
  antecedent text,
  behaviour_observed text,
  consequence text,
  outcome text,
  created_at timestamptz not null default now()
);
create index on public.session_abc_observations (session_id);

alter table public.session_abc_observations enable row level security;

-- Same idiom as the other session_* entry tables (0011): the assigned
-- therapist manages their own session's rows, admins can read everything.
create policy "assigned therapist manages abc observations" on public.session_abc_observations
  for all using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = session_abc_observations.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "admins view all abc observations" on public.session_abc_observations
  for select using (public.current_user_role() = 'admin');

-- Grants: skills/session_skill_entries already have blanket table-level
-- grants (0012), so the two new columns on them need nothing further.
-- session_abc_observations is a brand-new table and needs the same explicit
-- grant every raw-SQL-created table needs (0003/0005/0012 root cause).
grant select, insert, update, delete on public.session_abc_observations to authenticated;
grant all privileges on public.session_abc_observations to service_role;

-- therapy_sessions uses a column-level select grant (0012), so the two new
-- columns must be added to it explicitly or they're invisible to the app.
grant select (
  id, child_id, therapist_id, booking_id, session_date, duration_minutes,
  therapy_type, setting, status, therapist_notes, attendance,
  general_presentation, created_at, updated_at
) on public.therapy_sessions to authenticated;
