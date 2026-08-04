-- Hayven initial schema
-- Matches the 15-entity data model in Hayven_Build_Plan.md, adapted for
-- Supabase: authentication/password storage lives in Supabase's own
-- `auth.users` table, so `public.users` is a profile table keyed 1:1 to it
-- (no password_hash column here -- Supabase Auth owns that).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('parent', 'therapist', 'admin');
create type user_status as enum ('active', 'suspended');
create type session_type as enum ('in_person', 'virtual');
create type verification_status as enum ('pending', 'verified', 'rejected', 'flagged');
create type credential_document_type as enum ('certificate', 'membership_id', 'degree');
create type verification_request_status as enum ('submitted', 'in_review', 'approved', 'rejected', 'needs_more_info');
create type verification_method as enum ('phone_confirmation', 'email_confirmation', 'membership_number_lookup');
create type booking_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_type as enum ('session_commission', 'listing_fee', 'parent_subscription');
create type payment_status as enum ('pending', 'successful', 'failed', 'refunded');
create type progress_goal_status as enum ('set', 'in_progress', 'achieved');
create type subscription_plan as enum ('monthly', 'annual');
create type subscription_status as enum ('active', 'cancelled', 'past_due');
create type notification_type as enum (
  'booking_confirmed', 'new_message', 'note_added',
  'payment_receipt', 'verification_update', 'meeting_link_ready'
);

-- ---------------------------------------------------------------------------
-- 1. users -- profile table, 1:1 with auth.users
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  phone text,
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a public.users row whenever someone signs up via Supabase Auth.
-- role/full_name/phone are expected in the signup call's `options.data`.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, full_name, email, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'parent'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. children
-- ---------------------------------------------------------------------------

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  first_name text not null,
  date_of_birth date not null,
  presenting_concern text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. specialties (lookup table)
-- ---------------------------------------------------------------------------

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  governing_body text
);

-- ---------------------------------------------------------------------------
-- 4. therapist_profiles
-- ---------------------------------------------------------------------------

create table public.therapist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio text,
  location text,
  session_types session_type[] not null default '{}',
  price_per_session integer not null default 0, -- kobo/naira minor unit? stored as whole naira per API spec examples
  verification_status verification_status not null default 'pending',
  verified_badge_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. therapist_specialties (join table)
-- ---------------------------------------------------------------------------

create table public.therapist_specialties (
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  primary key (therapist_id, specialty_id)
);

-- ---------------------------------------------------------------------------
-- 6. credentials
-- ---------------------------------------------------------------------------

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  document_type credential_document_type not null,
  file_url text not null, -- storage object path, never a public URL -- resolve to a signed URL at read time
  issuing_body text not null,
  membership_number text,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. verification_requests
-- ---------------------------------------------------------------------------

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  admin_id uuid references public.users(id),
  status verification_request_status not null default 'submitted',
  verification_method verification_method,
  reviewer_notes text, -- INTERNAL ONLY -- never select this column for parent/therapist-facing queries
  parent_facing_reason text, -- shown to therapist on rejection instead of reviewer_notes
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 8. availability_slots
-- ---------------------------------------------------------------------------

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_booked boolean not null default false,
  session_type session_type not null
);

-- ---------------------------------------------------------------------------
-- 9. bookings
-- ---------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id),
  child_id uuid not null references public.children(id),
  therapist_id uuid not null references public.therapist_profiles(id),
  availability_slot_id uuid not null references public.availability_slots(id),
  status booking_status not null default 'pending_payment',
  session_type session_type not null,
  meeting_link text,
  location text,
  expires_at timestamptz, -- pending_payment hold window; release slot if payment doesn't land in time
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  payer_id uuid not null references public.users(id),
  payee_id uuid references public.users(id),
  amount integer not null,
  type payment_type not null,
  gateway_reference text not null unique,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 11. messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  content text not null,
  sent_at timestamptz not null default now(),
  flagged boolean not null default false
);

-- ---------------------------------------------------------------------------
-- 12. session_notes
-- ---------------------------------------------------------------------------

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  therapist_id uuid not null references public.therapist_profiles(id),
  summary text not null,
  goals_addressed text[] not null default '{}',
  recommendations text,
  visible_to_parent boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 13. progress_goals
-- ---------------------------------------------------------------------------

create table public.progress_goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  therapist_id uuid not null references public.therapist_profiles(id),
  title text not null,
  status progress_goal_status not null default 'set',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 14. subscriptions
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id),
  plan subscription_plan not null,
  status subscription_status not null default 'active',
  renews_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- 15. notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the lookups the app actually does
-- ---------------------------------------------------------------------------

create index on public.children (parent_id);
create index on public.therapist_profiles (verification_status);
create index on public.availability_slots (therapist_id, start_time);
create index on public.bookings (parent_id);
create index on public.bookings (therapist_id);
create index on public.messages (booking_id, sent_at);
create index on public.notifications (user_id, read);
create index on public.verification_requests (status);
