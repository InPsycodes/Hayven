# Backlog

Known, deliberately-deferred work. Not a full roadmap — just items that were
scoped out of a specific pass and shouldn't get lost.

## Retire the old session-notes system

**Status:** done. The premise this was deferred on (both dashboard widgets
still depending on the old system) turned out to be stale by the time this
was picked back up — `/parent` and `/therapist` had already been migrated to
`therapy_sessions`/`reports` in an earlier pass. Removed as pure dead-code
cleanup: `src/lib/session-notes/`, `src/components/session-report/`,
`src/app/(app)/therapist/sessions/` (the orphaned old report route),
`getRealReportsDueForTherapist`, the "Session notes" sidebar entry, and
`src/data/mutations.ts` (unrelated dead fixture-era scaffold, found in the
same pass). The `session_notes`/`progress_goals` tables were deliberately
left in place at the schema level — nothing reads or writes them anymore,
but dropping them was out of scope for this pass.
