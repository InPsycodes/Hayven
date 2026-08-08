# Backlog

Known, deliberately-deferred work. Not a full roadmap — just items that were
scoped out of a specific pass and shouldn't get lost.

## Retire the old session-notes system

**Status:** not started. Deferred deliberately after the care-team (supervisor
role, admin-managed assignments, audit logging) work landed on the *new*
therapy-sessions/reports system only.

**Why this exists:** there are two parallel systems for a therapist to
document a session and share a summary with a parent.

- **Old**: booking-scoped, `src/lib/session-notes/` (`session_notes`,
  `progress_goals` tables) + `src/components/session-report/parent-summary-generator.ts`,
  surfaced at `/therapist/sessions/[bookingId]/report`.
- **New**: child-scoped, `src/lib/therapy-sessions/` + `src/lib/reports/`
  (rule-based generator, `reports.therapist_body`/`parent_body`, a real
  publish workflow), surfaced at `/therapist/children/[childId]/sessions/[sessionId]`.

**Why it matters now**: the old system is not dead code — it's live in two
places:
- `/parent` (`src/app/(app)/parent/page.tsx`) renders a real "progress" card
  via `getRealLatestProgressUpdateForChild` (`src/lib/session-notes/queries.ts`),
  reading `progress_goals` + `session_notes.recommendations` where
  `visible_to_parent = true`.
- `/therapist` (`src/app/(app)/therapist/page.tsx`) shows a "Reports due"
  stat + "needs attention" list via `getRealReportsDueForTherapist`
  (`src/lib/booking/queries.ts`), for completed bookings missing a
  `session_notes` row.

Nothing else touches it: no admin surface, no payments/booking-completion
wiring. It's purely those two dashboard widgets.

Structurally, it's now the clear second-class system — it never got any of
the care-team improvements, and can't easily get them without duplicating
work already done for the new system:
- No supervisor read access (`src/app/supervisor/**` only ever queries the
  new system's tables).
- No admin-managed access grant — old-system visibility is purely "is this
  booking's `therapist_id` me," with no assignment concept at all.
- No publish/review step before a parent sees something (writes go straight
  to `visible_to_parent`).
- No audit trail beyond creation (`addProgressGoal`/`submitRealSessionNote`
  log a create event; nothing else about the old system is ever logged).

**Why not retire outright**: the two systems track progress differently —
old is a single evolving goal list + freeform recommendation text; new is
per-session structured percentages. The parent progress card and the
therapist reports-due nudge both need a real design decision for what they
should show once repointed at the new data shape, not a mechanical table
swap.

**Recommended next step**: a dedicated planning pass (same rigor as the
supervisor feature: Explore → Plan → approve → build) scoped specifically
to (1) redesigning what the parent progress card and reports-due nudge
should mean against the new data model, (2) migrating both widgets, (3)
retiring `session_notes`/`progress_goals`/the old report route once nothing
reads them. Not urgent — nothing about the old system is broken or
exploitable, it's consistency debt, not a bug.
