-- E5 from the external PRD review: therapist_child_assignments.ended_on
-- exists but is write-only -- nothing ever reads it, and the only way an
-- assignment ends is a human admin/supervisor manually clicking "end."
-- There is no time-based threshold anywhere that lapses an assignment on
-- its own, unlike every other time-bound access/data window in this schema
-- (booking holds, account purges, clinical/payment retention). A departed
-- or long-inactive therapist keeps full standing access to a child's
-- clinical records indefinitely unless someone remembers to end it.
--
-- Fix, per the agreed spec: 90 days with no recorded clinical session or
-- documented clinical activity (therapy_sessions.session_date, or a
-- session_notes row -- the same two clinical systems src/lib/clinical/
-- purge.ts's retention anchor already accounts for) auto-expires the
-- assignment. is_assigned_therapist() (0086) already requires
-- status = 'active', so an 'expired' status cuts access off immediately
-- and completely with zero RLS changes needed here -- it just isn't
-- 'active' anymore, the same as 'ended'. Consent revocation (0086) is a
-- fully separate, already-independent check (intake_consents, ANDed on
-- top of the assignment-active check) -- unaffected by and unrelated to
-- this, so it remains an immediate cutoff regardless of this 90-day
-- window, exactly as required.
--
-- ended_reason records why a row stopped being active ('manual' | 'inactivity'),
-- for the audit trail the review specifically asked for. Existing ended
-- rows have no recorded reason (predates this column) -- left null rather
-- than guessed.

alter type assignment_status add value 'expired';

alter table public.therapist_child_assignments
  add column ended_reason text;
