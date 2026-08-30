-- Same bug class as 0060: 0052 granted only select, insert, delete on
-- push_subscriptions, but subscribeToPush() upserts with
-- onConflict: "endpoint", which compiles to INSERT ... ON CONFLICT DO
-- UPDATE and requires UPDATE privilege on the table even when a given call
-- never actually hits a conflict. Every push-notification (re-)subscription
-- -- a common path, since service workers routinely resubscribe on load --
-- fails with "permission denied for table push_subscriptions" (42501)
-- until this is applied. The RLS policy (user_id = auth.uid()) is already
-- correct; this is purely a missing table-level grant.
grant update on public.push_subscriptions to authenticated;
