-- Security fix: 0014 added a parent-facing SELECT policy on `reports`
-- scoped to which ROWS a parent can see (published_at set, own child), but
-- RLS is row-level only -- the pre-existing column grant from 0012 (written
-- back when the only reader was the assigned therapist) still applied, so a
-- parent could select therapist_body / input_snapshot / and other
-- clinician-only columns for their own child's published report, not just
-- the deliberately-softened parent_body this feature was built to show them.
--
-- Same fix shape as confidential_note / reviewer_notes / debug_payload
-- elsewhere in this schema: revoke SELECT on the clinician-only columns from
-- authenticated entirely (write access is untouched -- therapist writes to
-- these already go through the normal client and don't need to change), and
-- move the one legitimate reader (the therapist's own session page) onto a
-- service-role read that re-checks assignment app-side. See
-- src/lib/reports/queries.ts's getReportForSession.

revoke select (
  therapist_body, model_version, prompt_version, generation_ms, input_snapshot,
  token_usage, attempt_count, error_code, error_message, requested_by, approved_by
) on public.reports from authenticated;
