-- Two Medium findings from the loophole audit that follows 0049's critical fix.

-- ---------------------------------------------------------------------------
-- 1. subscriptions -- same missing-WITH CHECK shape 0049 fixed for `users`,
-- but the correct fix here is closer to `payments`'s existing model than a
-- bare WITH CHECK: a subscription is a paid entitlement, so a parent should
-- never be able to write their own status/plan/renews_at directly (today's
-- "parent manages own subscription" for-all policy let a parent forge a
-- fake active subscription, any plan, any far-future renewal date, with no
-- payment at all). No live feature currently reads this table -- parent
-- subscription status is still served from static fixture data -- so this
-- is a zero-behavior-change schema fix today, done now so the table is
-- already correct once something real reads it.
-- ---------------------------------------------------------------------------

drop policy "parent manages own subscription" on public.subscriptions;

create policy "parent views own subscription" on public.subscriptions
  for select using (parent_id = auth.uid());

revoke insert, update, delete on public.subscriptions from authenticated;

-- ---------------------------------------------------------------------------
-- 2. session_abc_observations -- added in 0040 using the pre-0022 combined
-- "assigned therapist manages" shape, reopening exactly the bug 0022 fixed
-- for its four sibling tables (session_behaviour_entries, session_skill_
-- entries, session_goal_progress, session_reinforcers): any therapist
-- sharing a case could edit or delete another therapist's own clinical
-- documentation, not just read it. Same split as those four tables --
-- shared read for the whole care team, write/edit/delete restricted to the
-- authoring therapist via is_own_therapy_session().
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages abc observations" on public.session_abc_observations;

create policy "assigned therapist views abc observations" on public.session_abc_observations
  for select using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = session_abc_observations.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "therapist manages own abc observations" on public.session_abc_observations
  for insert with check (public.is_own_therapy_session(session_id));
create policy "therapist updates own abc observations" on public.session_abc_observations
  for update using (public.is_own_therapy_session(session_id));
create policy "therapist deletes own abc observations" on public.session_abc_observations
  for delete using (public.is_own_therapy_session(session_id));
