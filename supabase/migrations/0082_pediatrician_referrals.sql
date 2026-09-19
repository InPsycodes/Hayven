-- Pediatrician/GP referral pipeline (PRD "multi-audience website structure",
-- section 14/15) -- a second front door into Hayven besides a parent
-- self-registering. A referring clinician submits a short form with no
-- Hayven account, gets a reference code, and can check status later with
-- that code plus their own email -- never full clinical detail, per the
-- PRD's own privacy boundary.
--
-- Deliberately NOT wired into `children` at submission time: a referral is
-- a lead, not a child profile. It only becomes one (`converted_child_id`)
-- once a parent actually signs up and a real, RLS-protected `children` row
-- exists -- so an abandoned referral never touches clinical data or the
-- Care Team model (0022) at all.
--
-- RLS is enabled with zero policies, and there is no grant to
-- `anon`/`authenticated` at all -- same lockout as audit_log (0026). The
-- referrer has no Hayven account to hold a policy against anyway. Every
-- write and read (public submission, public status lookup, admin queue)
-- goes through src/lib/referrals/{actions,queries}.ts via createAdminClient()
-- (service-role), which bypasses grants/RLS entirely -- this keeps the table
-- unreachable directly through PostgREST with just the public anon key,
-- consistent with why 0055 locked down the rate-limit RPC the same way.

create type referral_status as enum (
  'received',
  'family_contacted',
  'assessment_scheduled',
  'care_started'
);

-- Admin-facing only, same as verification_update/support_request_new --
-- fans out to every admin when a referral is submitted (see
-- src/lib/referrals/actions.ts). No referrer-facing notification type
-- exists because a referrer has no Hayven account/user_id to hold one
-- against; status updates reach them by plain email instead.
alter type notification_type add value 'referral_new';

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,

  child_name text not null,
  child_age integer,
  parent_contact text not null,

  referrer_name text not null,
  referrer_facility text,
  referrer_specialty text,
  referrer_contact text not null,

  reason_tags text[] not null default '{}',
  additional_info text,

  status referral_status not null default 'received',
  converted_child_id uuid references public.children(id) on delete set null,

  created_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now()
);

create index on public.referrals (status, created_at desc);
create index on public.referrals (reference_code);

alter table public.referrals enable row level security;

grant all privileges on public.referrals to service_role;
