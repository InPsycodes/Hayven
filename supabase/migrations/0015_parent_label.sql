-- Raw target_behaviour labels are clinical shorthand (e.g. "Elopement",
-- "Tantrum duration") written for the therapist's own record-keeping, not
-- for a parent to read. There was no friendlier name to fall back on, so
-- the parent-facing report had to use the clinical label verbatim.
--
-- parent_label is optional and therapist-set (via the session entry form,
-- next to the behaviour it already lists). The parent-facing generator
-- falls back to the clinical label, lowercased, when it's not set.

-- target_behaviours got a blanket (not column-scoped) grant in 0012, so a
-- new column here inherits it automatically -- no grant statement needed.
alter table public.target_behaviours add column parent_label text;
