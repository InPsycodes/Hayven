-- Idempotent re-run of 0006: a prior partial attempt left the storage
-- policies in place but rolled back the bucket creation (same transaction).
-- Drops+recreates policies so this is safe regardless of what already exists.

insert into storage.buckets (id, name, public)
values ('credentials', 'credentials', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "therapist uploads own credentials" on storage.objects;
drop policy if exists "therapist reads own credentials" on storage.objects;
drop policy if exists "therapist deletes own credentials" on storage.objects;
drop policy if exists "anyone uploads own avatar" on storage.objects;
drop policy if exists "anyone updates own avatar" on storage.objects;
drop policy if exists "anyone can view avatars" on storage.objects;

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
