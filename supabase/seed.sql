-- Lookup data only. Users/therapists/bookings get created through the real
-- signup and booking flows once auth is wired up -- seeding those requires
-- creating auth.users via the Admin API, not plain SQL.

insert into public.specialties (name, governing_body) values
  ('Developmental Psychology', 'Nigerian Psychological Association'),
  ('Clinical Psychology', 'Nigerian Psychological Association'),
  ('Speech Therapy', 'Nigerian Association of Speech-Language Pathologists'),
  ('Occupational Therapy', 'Association of Occupational Therapists of Nigeria'),
  ('Psychiatry', 'Medical and Dental Council of Nigeria'),
  ('Special-Needs Education', null),
  ('Counselling', 'Counselling Association of Nigeria')
on conflict (name) do nothing;
