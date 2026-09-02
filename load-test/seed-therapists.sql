-- ===========================================================================
-- Load-test seed: synthetic verified therapists so /search and the discovery
-- query have something realistic to chew on.
--
-- RUN THIS ONLY ON A THROWAWAY / STAGING SUPABASE PROJECT. It writes directly
-- to auth.users and bypasses the normal signup + admin-verification flow.
-- Never run it against production.
--
-- Prereqch: all migrations through 0076 applied on the target project.
--
-- Undo: everything it creates is tagged, so this removes it cleanly --
--   delete from auth.users where email like 'loadtest+%@hayven.test';
--   (cascades to public.users -> therapist_profiles -> slots/specialties)
-- ===========================================================================

do $$
declare
  n_therapists int := 40;          -- bump for a bigger discovery result set
  slots_per_therapist int := 12;
  i int;
  s int;
  uid uuid;
  tp_id uuid;
  spec_ids uuid[];
  start_ts timestamptz;
begin
  select coalesce(array_agg(id), '{}') into spec_ids from public.specialties;
  if array_length(spec_ids, 1) is null then
    raise notice 'No rows in public.specialties -- therapists will have no specialty tags.';
  end if;

  for i in 1..n_therapists loop
    uid := gen_random_uuid();

    -- The on_auth_user_created trigger turns this into a public.users row with
    -- role = therapist (read from raw_user_meta_data).
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      uid, 'authenticated', 'authenticated',
      format('loadtest+t%s@hayven.test', i),
      crypt('load-test-not-a-real-login', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'role', 'therapist',
        'full_name', format('Test Therapist %s', i),
        'phone', format('+234800%07s', i)
      ),
      now(), now()
    );

    insert into public.therapist_profiles (
      user_id, bio, location, session_types, price_per_session,
      years_practicing, verification_status, verified_badge_label,
      bank_code, bank_account_number, bank_account_name
    )
    values (
      uid,
      format('Load-test profile %s. Paediatric speech, OT and behavioural support for children aged 2-12.', i),
      (array['Lagos','Abuja','Ikeja','Lekki','Port Harcourt'])[1 + (i % 5)],
      (array[array['virtual']::session_type[], array['in_person']::session_type[], array['virtual','in_person']::session_type[]])[1 + (i % 3)],
      15000 + (i % 8) * 2500,
      2 + (i % 15),
      'verified',
      'Verified',
      '058', format('%010s', 1000000000 + i), format('Test Therapist %s', i)
    )
    returning id into tp_id;

    -- 1-2 specialties each
    if array_length(spec_ids, 1) is not null then
      insert into public.therapist_specialties (therapist_id, specialty_id)
      values (tp_id, spec_ids[1 + (i % array_length(spec_ids, 1))])
      on conflict do nothing;
      insert into public.therapist_specialties (therapist_id, specialty_id)
      values (tp_id, spec_ids[1 + ((i + 3) % array_length(spec_ids, 1))])
      on conflict do nothing;
    end if;

    -- Future availability so 0076's "must have a slot" gate passes and the
    -- "next opening" / availability filter has data.
    for s in 1..slots_per_therapist loop
      start_ts := date_trunc('hour', now())
        + ((s * 2 + (i % 3)) || ' hours')::interval
        + '2 days'::interval;
      insert into public.availability_slots (therapist_id, start_time, end_time, is_booked, session_type)
      values (
        tp_id, start_ts, start_ts + '45 minutes'::interval, false,
        (array['virtual','in_person'])[1 + (s % 2)]::session_type
      );
    end loop;
  end loop;

  raise notice 'Seeded % therapists with % slots each.', n_therapists, slots_per_therapist;
end $$;
