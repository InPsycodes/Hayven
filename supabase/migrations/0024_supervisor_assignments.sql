-- Care team model, part 1: supervisor_assignments pairs a supervisor
-- (public.users, role='supervisor') with the therapists they oversee. Same
-- shape as therapist_child_assignments (0010), same idiom.

create table public.supervisor_assignments (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.users(id) on delete cascade,
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  status assignment_status not null default 'active',
  started_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now()
);
create unique index supervisor_assignments_active_uniq
  on public.supervisor_assignments (supervisor_id, therapist_id) where status = 'active';
create index on public.supervisor_assignments (therapist_id) where status = 'active';

create function public.is_supervisor_of_therapist(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.supervisor_assignments
    where supervisor_id = auth.uid() and therapist_id = p_therapist_id and status = 'active'
  );
$$;

alter table public.supervisor_assignments enable row level security;

create policy "admins manage all supervisor assignments" on public.supervisor_assignments
  for all using (public.current_user_role() = 'admin');
create policy "supervisor views own team" on public.supervisor_assignments
  for select using (supervisor_id = auth.uid());

-- Real DB-level enforcement for "a supervisor manages their own team's child
-- assignments" -- additive alongside the existing policies on this table
-- from 0011 (parent manages own children's assignments; therapist
-- self-assigns from a booking; admins manage all).
create policy "supervisor manages team assignments" on public.therapist_child_assignments
  for all using (public.is_supervisor_of_therapist(therapist_id))
  with check (public.is_supervisor_of_therapist(therapist_id));

grant select on public.supervisor_assignments to authenticated;
grant all privileges on public.supervisor_assignments to service_role;
grant execute on function public.is_supervisor_of_therapist(uuid) to authenticated, service_role;
