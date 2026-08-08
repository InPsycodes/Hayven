-- Seed data for the progress-report validation slice: three children under
-- the existing "Test Parent" account, assigned to the existing
-- "Sprint1 Test Therapist" account, covering the three chart cold-start
-- tiers (0 sessions / 1 session / 6 sessions). Uses the real test accounts
-- already in this project rather than creating new auth users (which this
-- repo's own seed.sql comment notes can't be done via plain SQL).
--
-- Re-runnable: every insert is keyed off a fixed literal id with
-- `on conflict do nothing`, so running this twice is a no-op the second time.

do $$
declare
  v_parent_id uuid := '6578db69-6a79-445c-b08b-0284c9ce7283';       -- Test Parent
  v_therapist_id uuid := '1fb2be6a-6f6e-474a-a27d-0ac1fb7fa081';    -- Sprint1 Test Therapist (therapist_profiles.id)

  v_child_zero uuid := 'a0000000-0000-0000-0000-000000000001';
  v_child_one uuid := 'a0000000-0000-0000-0000-000000000002';
  v_child_six uuid := 'a0000000-0000-0000-0000-000000000003';

  v_goal_1 uuid := 'b0000000-0000-0000-0000-000000000001';
  v_goal_2 uuid := 'b0000000-0000-0000-0000-000000000002';
  v_behaviour_1 uuid := 'c0000000-0000-0000-0000-000000000001';
  v_behaviour_2 uuid := 'c0000000-0000-0000-0000-000000000002';
  v_skill_1 uuid := 'd0000000-0000-0000-0000-000000000001';
  v_skill_2 uuid := 'd0000000-0000-0000-0000-000000000002';

  v_session_one uuid := 'e0000000-0000-0000-0000-000000000000';
  v_session uuid;
  v_session_date date;
  i integer;
begin

  -- ---------------------------------------------------------------------
  -- Children
  -- ---------------------------------------------------------------------
  insert into public.children (id, parent_id, first_name, date_of_birth, presenting_concern)
  values
    (v_child_zero, v_parent_id, 'ZeroSessionChild', '2019-03-01', 'Seed: no sessions yet, tests the empty-state branch.'),
    (v_child_one, v_parent_id, 'OneSessionChild', '2018-06-15', 'Seed: exactly one session, tests the single-point branch.'),
    (v_child_six, v_parent_id, 'SixSessionChild', '2017-11-20', 'Seed: six sessions of history, tests full charts + generation.')
  on conflict (id) do nothing;

  -- Assign the test therapist to all three.
  insert into public.therapist_child_assignments (therapist_id, child_id, therapy_type)
  select v_therapist_id, c, 'ABA'
  from unnest(array[v_child_zero, v_child_one, v_child_six]) as c
  where not exists (
    select 1 from public.therapist_child_assignments
    where therapist_id = v_therapist_id and child_id = c
  );

  -- ---------------------------------------------------------------------
  -- Diagnosis, goals, target behaviours, skills -- shared by the one- and
  -- six-session children so both exercise the same generation payload shape.
  -- ---------------------------------------------------------------------
  insert into public.child_diagnoses (id, child_id, label, diagnosed_by, is_self_reported)
  select ('c1000000-0000-0000-0000-00000000000' || row_number() over ())::uuid,
         c, 'Autism spectrum disorder', 'Lagos University Teaching Hospital', false
  from unnest(array[v_child_one, v_child_six]) as c
  on conflict (id) do nothing;

  insert into public.goals (id, child_id, therapist_id, title, description, domain, baseline_value, target_value, unit, status)
  values
    (v_goal_1, v_child_six, v_therapist_id, 'Increase verbal requesting', 'Requests preferred items using a 2-word phrase.', 'communication', '10', '80', 'percent independent', 'active'),
    (v_goal_2, v_child_six, v_therapist_id, 'Reduce elopement', 'Decrease frequency of leaving the designated area without permission.', 'behaviour', '8', '1', 'per session', 'active')
  on conflict (id) do nothing;

  insert into public.target_behaviours (id, child_id, label, definition, direction, measurement)
  values
    (v_behaviour_1, v_child_six, 'Elopement', 'Leaving the designated therapy area without permission or an accompanying adult.', 'decrease', 'frequency'),
    (v_behaviour_2, v_child_six, 'Tantrum duration', 'Crying, screaming, or dropping to the floor lasting more than 10 seconds.', 'decrease', 'duration')
  on conflict (id) do nothing;

  insert into public.skills (id, child_id, label, mastery_criteria)
  values
    (v_skill_1, v_child_six, 'Two-word phrase requesting', '80% independent across 3 consecutive sessions.'),
    (v_skill_2, v_child_six, 'Following 2-step instructions', '80% independent across 3 consecutive sessions.')
  on conflict (id) do nothing;

  -- Same programme for the one-session child, scaled down (goal + behaviour only).
  insert into public.goals (id, child_id, therapist_id, title, description, domain, baseline_value, target_value, unit, status)
  values
    ('b0000000-0000-0000-0000-000000000003', v_child_one, v_therapist_id, 'Increase verbal requesting', 'Requests preferred items using a 2-word phrase.', 'communication', '10', '80', 'percent independent', 'active')
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------
  -- One session for OneSessionChild
  -- ---------------------------------------------------------------------
  insert into public.therapy_sessions (id, child_id, therapist_id, session_date, duration_minutes, therapy_type, setting, status, therapist_notes)
  values (
    v_session_one, v_child_one, v_therapist_id, current_date - interval '3 days', 45, 'ABA', 'in_person', 'complete',
    'First session. Child engaged well with preferred items. Some initial resistance to transitions, settled after a visual timer was introduced.'
  )
  on conflict (id) do nothing;

  insert into public.session_goal_progress (session_id, goal_id, percent_complete, note)
  values (v_session_one, 'b0000000-0000-0000-0000-000000000003', 15, 'Baseline session -- establishing rapport and preference assessment.')
  on conflict do nothing;

  -- ---------------------------------------------------------------------
  -- Six sessions for SixSessionChild, weekly, with an improving trend on
  -- both goals/skills and a decreasing trend on both target behaviours.
  -- ---------------------------------------------------------------------
  for i in 0..5 loop
    v_session := ('e0000000-0000-0000-0000-00000000001' || i)::uuid;
    v_session_date := current_date - ((6 - i) * 7 || ' days')::interval;

    insert into public.therapy_sessions (id, child_id, therapist_id, session_date, duration_minutes, therapy_type, setting, status, therapist_notes)
    values (
      v_session, v_child_six, v_therapist_id, v_session_date, 60, 'ABA', 'in_person', 'complete',
      case i
        when 0 then 'Baseline week. High rate of elopement, tantrums frequent and prolonged. Requesting almost entirely prompted.'
        when 5 then 'Strong session. Elopement rare, tantrums brief when they occur. Spontaneous 2-word requests observed multiple times without prompting.'
        else 'Steady progress. Prompt levels fading on requesting task; behaviours trending down.'
      end
    )
    on conflict (id) do nothing;

    insert into public.session_behaviour_entries (session_id, target_behaviour_id, count, antecedent, consequence, notes)
    values (v_session, v_behaviour_1, greatest(1, 8 - i * 2), 'Denied access to preferred item', 'Redirected to designated area, brief break offered', null)
    on conflict do nothing;

    insert into public.session_behaviour_entries (session_id, target_behaviour_id, duration_seconds, antecedent, consequence, notes)
    values (v_session, v_behaviour_2, greatest(5, 90 - i * 15), 'Transition between activities', 'Waited out, praised on calm', null)
    on conflict do nothing;

    insert into public.session_skill_entries (session_id, skill_id, trials_total, trials_correct, prompt_level)
    values (
      v_session, v_skill_1, 10, least(9, 2 + i * 1),
      case when i < 2 then 'full_physical' when i < 4 then 'verbal' else 'independent' end::prompt_level
    )
    on conflict do nothing;

    insert into public.session_skill_entries (session_id, skill_id, trials_total, trials_correct, prompt_level)
    values (
      v_session, v_skill_2, 8, least(7, 1 + i * 1),
      case when i < 2 then 'gestural' when i < 4 then 'verbal' else 'independent' end::prompt_level
    )
    on conflict do nothing;

    insert into public.session_goal_progress (session_id, goal_id, percent_complete, note)
    values (v_session, v_goal_1, least(85, 15 + i * 12), null)
    on conflict do nothing;

    insert into public.session_goal_progress (session_id, goal_id, percent_complete, note)
    values (v_session, v_goal_2, least(80, 20 + i * 10), null)
    on conflict do nothing;

    insert into public.session_reinforcers (id, session_id, label, effectiveness)
    values (('f0000000-0000-0000-0000-00000000001' || i)::uuid, v_session, 'Bubbles', 4 + (i % 2))
    on conflict (id) do nothing;
  end loop;

  -- Bump skills.current_percent to the latest session's computed values.
  update public.skills set current_percent = 90 where id = v_skill_1;
  update public.skills set current_percent = 87.5 where id = v_skill_2;

end $$;
