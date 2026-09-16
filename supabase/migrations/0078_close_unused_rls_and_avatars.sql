-- Full-platform diagnostic, 2026-09-16: closes two findings from
-- docs/production-audit-2026-09-03.md that a prior migration didn't reach.

-- M-3: "parent creates own bookings" only checks parent_id = auth.uid() and
-- status = 'pending_payment' -- it never validates child_id, therapist_id,
-- availability_slot_id, or that the slot is actually held. The app never
-- uses it: createPendingBooking (src/lib/booking/actions.ts) always inserts
-- via the service-role client, which bypasses RLS entirely. Same call 0018
-- already made for the matching UPDATE policy -- drop the unused, unsafe
-- INSERT surface instead of trying to patch it.
drop policy if exists "parent creates own bookings" on public.bookings;

-- M-4: the avatars bucket is public with no MIME/size restriction at the
-- policy level -- the app's own upload path does magic-byte + virus-scan +
-- size checks, but the raw Storage API bypasses all of it, letting any
-- authenticated user (including a parent) host an arbitrary file (e.g.
-- text/html) under a trusted *.supabase.co URL that this app's own CSP and
-- next/image remotePatterns both allow. Lock the bucket down to what the
-- app actually uploads: small images only.
update storage.buckets
set file_size_limit = 2621440, -- 2.5 MB, matches the app's own check
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'avatars';
