-- Audit 2026-10-29, F-07 (defence in depth). 0003_grants.sql granted SELECT
-- to `anon` on every public table, so row-level security has been the only
-- thing between a logged-out visitor and each table. RLS holds today
-- (verified table by table against production with the anon key), but one
-- future table created without RLS, or one over-broad policy, would be
-- readable by anyone on the internet at once.
--
-- This revokes every privilege `anon` holds on every public table except the
-- ones logged-out pages genuinely read -- the same set that carries policies
-- meant for everyone ("anyone can read ..."): specialties, therapist profiles
-- and specialties, availability slots, visible reviews, and the published
-- Learning Center. The public discovery view keeps its own grant. Signed-in
-- users (`authenticated`) are untouched.

do $$
declare
  t text;
  public_tables text[] := array[
    'specialties',
    'therapist_profiles',
    'therapist_specialties',
    'availability_slots',
    'therapist_reviews',
    'learning_categories',
    'learning_articles',
    'learning_resources'
  ];
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    if not (t = any (public_tables)) then
      execute format('revoke all on table public.%I from anon', t);
    end if;
  end loop;
end
$$;

-- The discovery view stays readable by logged-out visitors (the public
-- search and therapist profile pages).
grant select on public.therapist_public_profiles to anon;
