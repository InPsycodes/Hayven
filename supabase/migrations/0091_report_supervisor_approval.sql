-- E10/D5 from the external PRD review: reports.status/approved_by/approved_at
-- (migration 0010) already anticipated a draft -> in_review -> approved ->
-- published pipeline, but nothing ever wired up a second-party approval --
-- publishReport (src/lib/reports/actions.ts) set approved_by/approved_at to
-- the publishing therapist's own id, in the same action that set
-- published_at. There was no code path where a supervisor's approval
-- actually gated what a parent could see.
--
-- Fix, scoped to preserve this platform's existing elective-supervision
-- design (E9: not every therapist has one, and that's intentional): a
-- therapist with an active supervisor_assignments row now submits a report
-- for that supervisor's approval instead of publishing it directly: publish
-- Report sets status='in_review' and leaves published_at untouched; only
-- approveAndPublishReport (src/lib/supervisor/actions.ts), callable only by
-- an active supervisor of that specific therapist, can set published_at. A
-- therapist with no active supervisor keeps publishing directly, exactly as
-- before -- this never blocks anyone who has no supervisor to ask.
--
-- A supervisor previously had SELECT-only RLS on reports ("supervisor views
-- reports", 0025) -- deliberately, per that migration's own comment
-- ("read-only visibility ... for coordination/oversight"). Approving a
-- report needs a real UPDATE policy, which is new write access this table
-- never granted a supervisor before. The column-scoped GRANT already in
-- place (0051: therapist_body, status, published_at, approved_by,
-- approved_at, updated_at) is role-wide, not per-caller, so without a
-- content-edit guard a supervisor's new UPDATE access would also legally
-- reach therapist_body/parent_body -- the exact "any authenticated update
-- grant + row-only RLS = column tampering" class of bug 0051 itself fixed
-- for therapists. The trigger below closes it for anyone but the assigned
-- therapist, regardless of which policy let the UPDATE through.

alter type notification_type add value 'report_needs_approval';

create policy "supervisor approves reports" on public.reports
  for update using (
    exists (select 1 from public.therapy_sessions ts where ts.id = reports.session_id and public.is_supervised_child(ts.child_id))
  );

create function public.prevent_non_therapist_report_content_edit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_therapist_user_id uuid;
begin
  if new.therapist_body is not distinct from old.therapist_body
     and new.parent_body is not distinct from old.parent_body then
    return new;
  end if;

  select u.id into v_therapist_user_id
  from public.therapy_sessions ts
  join public.therapist_profiles tp on tp.id = ts.therapist_id
  join public.users u on u.id = tp.user_id
  where ts.id = new.session_id;

  if v_therapist_user_id is distinct from auth.uid() then
    raise exception 'Only the assigned therapist can edit report content.';
  end if;

  return new;
end;
$$;

create trigger prevent_non_therapist_report_content_edit
  before update on public.reports
  for each row execute procedure public.prevent_non_therapist_report_content_edit();
