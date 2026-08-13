-- Admin-editable phrase library for parent-facing report sentences, plus a
-- Warm/Direct tone setting. Admin variants are additive to the hardcoded
-- phrasings in generate.ts, never a replacement, so an empty/misconfigured
-- table can't break report generation. Readable by any authenticated user
-- because report generation runs under the therapist's own session (RLS),
-- not the service-role client -- writes stay admin-only.

create table public.report_phrase_variants (
  id uuid primary key default gen_random_uuid(),
  domain_key text not null,
  band text,
  tone text not null default 'warm' check (tone in ('warm', 'direct')),
  phrase text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.report_phrase_variants enable row level security;

create policy "phrase variants readable by authenticated" on public.report_phrase_variants
  for select using (auth.role() = 'authenticated');

create policy "admins add phrase variants" on public.report_phrase_variants
  for insert with check (public.current_user_role() = 'admin');

create policy "admins delete phrase variants" on public.report_phrase_variants
  for delete using (public.current_user_role() = 'admin');

alter table public.therapist_profiles
  add column report_tone text not null default 'warm' check (report_tone in ('warm', 'direct'));
