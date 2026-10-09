-- Therapist Agreement decisions (docs/therapist-agreement.md, decided
-- 2026-10-09):
--
-- 1. Professional indemnity insurance is required at verification. Proof is
--    stored as another credentials row (document_type 'insurance'), with
--    the cover end date in the new expires_on column, so the existing
--    private storage bucket, RLS, and admin signed-URL review all apply
--    unchanged. issuing_body holds the insurer, membership_number the
--    policy number.
--
-- 2. Click-to-accept for the Therapist Agreement, with the accepted
--    version and time recorded. One row per (therapist, version): a
--    material change ships as a new version and needs a new acceptance.
--    Rows are written only by server code (service role) after checking
--    the session, so there's no insert policy for `authenticated`.
--    Append-only in practice: no update/delete grant.

alter type credential_document_type add value if not exists 'insurance';

alter table public.credentials add column if not exists expires_on date;

-- "therapist manages own credentials" (0002) is `for all`, so a therapist
-- could UPDATE their own row after review -- e.g. push expires_on out to
-- fake a later cover end date, or swap file_url for a different document.
-- No app code updates or deletes credentials rows as a therapist (new
-- documents are always a new row), so revoke those privileges outright,
-- same approach as 0103.
revoke update, delete on public.credentials from authenticated;

create table public.therapist_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (therapist_id, version)
);

alter table public.therapist_agreement_acceptances enable row level security;

create policy "therapist views own agreement acceptances" on public.therapist_agreement_acceptances
  for select using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = therapist_agreement_acceptances.therapist_id and tp.user_id = auth.uid()
    )
  );

create policy "admins view agreement acceptances" on public.therapist_agreement_acceptances
  for select using (public.current_user_role() = 'admin');

grant select on public.therapist_agreement_acceptances to authenticated;
grant select, insert on public.therapist_agreement_acceptances to service_role;
