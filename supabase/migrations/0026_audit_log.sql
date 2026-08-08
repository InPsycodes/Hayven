-- audit_log: append-only trail for sensitive clinical/administrative
-- writes (session notes, goals, report generation/save/publish,
-- verification decisions, assignment changes). Deliberately NOT scoped to
-- reads/page-views.
--
-- RLS is enabled with zero policies, and there is no grant to `authenticated`
-- at all -- not even select. This is a double lockout, not an oversight:
-- every write goes through src/lib/audit/log.ts's logAuditEvent(), and the
-- only reader is the admin log viewer, both via createAdminClient()
-- (service-role), which bypasses grants/RLS entirely. No normal user should
-- ever be able to read or tamper with this table directly.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id),
  actor_role user_role not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  child_id uuid references public.children(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (created_at desc);
create index on public.audit_log (actor_id);
create index on public.audit_log (entity_type, entity_id);
create index on public.audit_log (child_id) where child_id is not null;

alter table public.audit_log enable row level security;

grant all privileges on public.audit_log to service_role;
