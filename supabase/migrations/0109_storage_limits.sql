-- Storage hardening from the pre-launch security check (2026-10-10).
--
-- 1. credentials bucket: the app only accepts PDF, JPG or PNG under 2.5 MB
--    (uploadCredentialFile in src/lib/therapist/actions.ts, after a virus
--    scan), but the bucket itself had no limits, so a therapist calling the
--    Storage API directly could store any file type at any size. The same
--    gap was closed for avatars in 0078; this matches the bucket to the app.
update storage.buckets
set file_size_limit = 2621440, -- 2.5 MB, matches MAX_CREDENTIAL_FILE_BYTES
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'credentials';

-- 2. avatars bucket: "anyone can view avatars" let anyone list every file in
--    the bucket, and file paths start with the owner's account id. The bucket
--    is public, so photos are served by their public URL without any SELECT
--    policy; the app never lists avatars. Reading is narrowed to the owner's
--    own folder, which the upload's upsert (overwrite) still needs.
drop policy if exists "anyone can view avatars" on storage.objects;

create policy "users read own avatar objects" on storage.objects
  for select using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text
  );
