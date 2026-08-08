-- Parent-facing progress reports: adds reports.child_id (denormalised off
-- therapy_sessions so a parent's RLS policy never needs to touch
-- therapy_sessions, which carries therapist_notes/confidential_note --
-- see 0011's comment on why parents get no policy there at all) and the
-- publish workflow columns already reserved in 0010 (approved_by,
-- approved_at, published_at) start getting used.

alter table public.reports add column child_id uuid references public.children(id) on delete cascade;

update public.reports r
set child_id = ts.child_id
from public.therapy_sessions ts
where ts.id = r.session_id and r.child_id is null;

alter table public.reports alter column child_id set not null;
create index on public.reports (child_id) where published_at is not null;

-- Keep child_id in sync automatically so app code can't forget to set it.
create function public.set_report_child_id()
returns trigger
language plpgsql
as $$
begin
  select ts.child_id into new.child_id
  from public.therapy_sessions ts
  where ts.id = new.session_id;
  return new;
end;
$$;
create trigger reports_set_child_id before insert on public.reports
  for each row execute procedure public.set_report_child_id();

grant select (child_id) on public.reports to authenticated;

-- A parent may read a report once it's published, for their own child, full
-- stop -- draft/in_review/approved-but-unpublished reports stay invisible so
-- a therapist can safely generate and revise before anything ships.
create policy "parent views own child published reports" on public.reports
  for select using (
    reports.published_at is not null
    and public.is_parent_of_child(reports.child_id)
  );
