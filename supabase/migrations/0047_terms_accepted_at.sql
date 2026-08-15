-- Records when a user agreed to the Privacy Policy/Terms of Service at
-- signup. Nullable: existing pre-launch accounts predate the checkbox and
-- have no meaningful value to backfill. Written by signUp() via the
-- service-role client (there may be no session yet if email confirmation
-- is pending), not through a table/column grant to `authenticated`.
alter table public.users
  add column terms_accepted_at timestamptz;
