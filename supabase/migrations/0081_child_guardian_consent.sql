-- NDPA compliance gap flagged in the 2026-09-19 legal review: the "Add a
-- child" form let a parent type a presenting concern (health/developmental
-- data, NDPA s.30 "sensitive personal data") with no explicit, separate
-- consent for that specific processing, and no confirmation the person
-- adding the child is actually their parent or legal guardian (NDPA s.31).
-- The later intake form's "Consent & sharing" section (0077) already
-- handles granular, revocable consent for therapist access, media, etc. --
-- this column covers the earlier, narrower gap: the moment presenting_concern
-- is first collected, before any intake form or therapist assignment exists.

alter table public.children add column guardian_consent_at timestamptz;

comment on column public.children.guardian_consent_at is
  'Set when the parent confirms, at child-creation time, that they are the child''s parent/legal guardian and consent to Hayven processing what they share here (including health/developmental information). Nullable for rows created before this column existed.';
