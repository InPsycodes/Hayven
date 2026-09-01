-- Clickable notifications: the in-app bell can now deep-link each row to the
-- thing it's about (a report, a message thread, a session). createNotification
-- already accepts a `url` (it was only used for the push payload); this gives
-- the in-app row somewhere to store it.
--
-- Nullable, no default -- older rows and any caller that doesn't set one just
-- render as non-clickable, same as today. No RLS or grant change: new column
-- on an existing table whose policies already cover it.

alter table public.notifications
  add column url text;
