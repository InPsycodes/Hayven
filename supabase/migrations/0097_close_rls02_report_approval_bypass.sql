-- RLS-02 fix (pre-launch audit, P1): the report supervisor-approval gate
-- (E10/D5, migration 0091) only existed in application code -- publishReport
-- routes a therapist with an active supervisor through status='in_review'
-- instead of publishing directly, and approveAndPublishReport is the only
-- place meant to set published_at. But neither RLS policy that can reach
-- reports.status/approved_by has a WITH CHECK, and the column-scoped GRANT
-- (0051) is role-wide, not per-caller:
--   1. "therapist updates own reports" (0022) has no WITH CHECK, so a
--      therapist with an active supervisor could set status='published'
--      directly via a raw update, bypassing publishReport's in_review
--      branch and the review it exists for entirely.
--   2. "supervisor approves reports" (0091) has no WITH CHECK either, so a
--      supervisor could set approved_by to any user id, not necessarily
--      their own -- forging who approved it.
--
-- RLS alone can't express "did this transition come through the right
-- flow" (a policy only ever sees the new row), so this is a trigger, the
-- same pattern already used for content-edit protection
-- (prevent_non_therapist_report_content_edit, also 0091).

create function public.enforce_report_approval_state_machine()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_therapist_profile_id uuid;
  v_therapist_user_id uuid;
  v_active_supervisor boolean;
begin
  if new.status is not distinct from old.status and new.approved_by is not distinct from old.approved_by then
    return new;
  end if;

  if new.status <> 'published' or old.status = 'published' then
    -- Only the transition INTO published is guarded here -- every other
    -- status change (draft/generating/in_review, or an edit to an
    -- already-published report flipping it back to in_review, per
    -- saveReport) has no special approval requirement.
    return new;
  end if;

  select ts.therapist_id, u.id
    into v_therapist_profile_id, v_therapist_user_id
  from public.therapy_sessions ts
  join public.therapist_profiles tp on tp.id = ts.therapist_id
  join public.users u on u.id = tp.user_id
  where ts.id = new.session_id;

  v_active_supervisor := exists (
    select 1 from public.supervisor_assignments sa
    where sa.therapist_id = v_therapist_profile_id and sa.status = 'active'
  );

  if v_active_supervisor then
    if old.status <> 'in_review' then
      raise exception 'A report can only be published from in_review while an active supervisor is assigned.';
    end if;
    if new.approved_by is distinct from auth.uid() or not exists (
      select 1 from public.supervisor_assignments sa
      where sa.therapist_id = v_therapist_profile_id
        and sa.status = 'active'
        and sa.supervisor_id = auth.uid()
    ) then
      raise exception 'This report must be approved by an active supervisor of the assigned therapist.';
    end if;
  else
    if new.approved_by is distinct from v_therapist_user_id or auth.uid() is distinct from v_therapist_user_id then
      raise exception 'A therapist with no active supervisor can only self-approve their own report.';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_report_approval_state_machine
  before update on public.reports
  for each row execute procedure public.enforce_report_approval_state_machine();
