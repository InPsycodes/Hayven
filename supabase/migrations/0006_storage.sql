-- Storage buckets for Sprint 1 (therapist onboarding & verification).
-- credentials: private -- certificates/degrees, never a public URL, only
--   ever read via a short-lived signed URL generated server-side.
-- avatars: public -- profile photos are meant to be shown on public
--   therapist profile pages.

insert into storage.buckets (id, name, public)
values ('credentials', 'credentials', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Files are stored under `{user_id}/{filename}` in both buckets, so RLS can
-- check the first path segment against auth.uid() to scope access to the
-- owner's own files.

create policy "therapist uploads own credentials"
  on storage.objects for insert
  with check (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist reads own credentials"
  on storage.objects for select
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist deletes own credentials"
  on storage.objects for delete
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin reads happen via the service-role client (bypasses storage RLS
-- entirely), consistent with how reviewer_notes access works.

create policy "anyone uploads own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "anyone updates own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
