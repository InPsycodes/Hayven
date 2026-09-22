-- RLS-04 fix (pre-launch audit, P2): "supervisor approves reports" (0091)
-- does a raw `exists (select ... from therapy_sessions ts where ts.id =
-- reports.session_id and is_supervised_child(ts.child_id))` -- is_supervised_child
-- itself is a correct SECURITY DEFINER function, but the outer EXISTS
-- queries therapy_sessions DIRECTLY, under the calling supervisor's own
-- RLS privileges. It only resolves today because "supervisor views
-- therapy sessions" (0025) happens to independently grant that same
-- supervisor RLS visibility into that exact row. If that policy is ever
-- dropped or narrowed later (this schema has done exactly that to a
-- sibling policy before -- 0032 dropping SELECT on
-- therapist_child_assignments, requiring 0035 to restore it), this EXISTS
-- would start silently returning false instead of erroring, exactly the
-- bug class 0033/0094 already hit twice. The other instance of this same
-- fragility (0027, on public.users) no longer exists -- RLS-01 (0098)
-- dropped that policy outright.
--
-- Fix: wrap the whole lookup in one more SECURITY DEFINER helper, so it
-- no longer depends on the calling supervisor having any OTHER RLS grant
-- into therapy_sessions.

create function public.is_supervised_report(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (
      select public.is_supervised_child(ts.child_id)
      from public.therapy_sessions ts
      where ts.id = p_session_id
    ),
    false
  );
$$;
grant execute on function public.is_supervised_report(uuid) to authenticated, service_role;

alter policy "supervisor approves reports" on public.reports
  using (public.is_supervised_report(reports.session_id));
