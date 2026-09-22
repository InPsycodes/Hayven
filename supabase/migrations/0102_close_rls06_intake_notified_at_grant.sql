-- RLS-06 fix (pre-launch audit, P3): intake_forms.therapist_notified_at
-- (0077) is meant to be a one-time, system-set flag ("so the notification
-- never repeats") -- but "parent manages own child intake form" (0058) is
-- `for all` with no column limit, and the table-wide grant (0058) covers
-- every column for insert/update. A parent could reset or pre-set it
-- directly, suppressing or manipulating the "your assigned therapist was
-- notified" signal. Low severity -- a workflow nuisance, not a
-- data-exposure issue -- but the system-only write (maybeNotifyTherapist,
-- src/lib/intake/actions.ts) already goes through the service-role client
-- and is unaffected by narrowing the parent's own grant.
--
-- Matches saveIntakeForm/recordIntakeConsent's actual write shape exactly:
-- child_id, details, updated_at. The four original free-text columns
-- (0058) are unused by the app since 0077 folded them into `details` --
-- left out of the new grant since nothing writes them anymore.

revoke insert, update on public.intake_forms from authenticated;

grant insert (child_id, details, updated_at) on public.intake_forms to authenticated;
-- child_id is in the UPDATE grant too, not just INSERT: saveIntakeForm's
-- upsert (onConflict: "child_id") makes PostgREST emit
-- `ON CONFLICT (child_id) DO UPDATE SET child_id = EXCLUDED.child_id, ...`
-- -- Postgres checks UPDATE privilege on every column in that SET clause,
-- including the conflict column itself, even though its value never
-- actually changes. Harmless to include: is_parent_of_child(child_id) is
-- still the WITH CHECK on the new row, so a parent still can't reassign a
-- form to a child they don't own.
grant update (child_id, details, updated_at) on public.intake_forms to authenticated;
