-- Therapists can edit the parent version of a report before publishing it.
--
-- 0051 limited UPDATE on public.reports to an explicit column list that
-- left parent_body out, because nothing edited it after generation. The
-- parent-version editor (saveParentReport in src/lib/reports/actions.ts)
-- now does. Who may change it is already narrowed twice over: the row-level
-- "therapist updates own reports" policy, and 0091's
-- prevent_non_therapist_report_content_edit trigger, which rejects a
-- content change from anyone but the assigned therapist (so a supervisor's
-- approval access still can't reach it).
--
-- The parent reads parent_body directly once published_at is set, so the
-- copy they were sent must not change underneath them. The app checks this,
-- and the trigger below makes it a rule of the table.

grant update (parent_body) on public.reports to authenticated;

create function public.prevent_published_parent_report_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.published_at is not null
     and new.parent_body is distinct from old.parent_body then
    raise exception 'A published report''s parent version can''t be changed.';
  end if;
  return new;
end;
$$;

create trigger prevent_published_parent_report_edit
  before update on public.reports
  for each row execute procedure public.prevent_published_parent_report_edit();
