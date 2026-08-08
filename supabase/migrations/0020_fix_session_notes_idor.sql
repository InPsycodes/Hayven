-- Security fix: "therapist manages own progress goals" and "therapist
-- manages own session notes" only checked that the row's therapist_id
-- matched the caller's own profile -- never that child_id/booking_id was
-- actually theirs to write to. The app-level checks added alongside this
-- migration (src/lib/session-notes/actions.ts) are defense in depth; this
-- is the real boundary, matching how "assigned therapists can view
-- children" already defines the relationship (any booking linking the
-- therapist to the child).

drop policy "therapist manages own progress goals" on public.progress_goals;
create policy "therapist manages own progress goals" on public.progress_goals
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      join public.bookings b on b.therapist_id = tp.id and b.child_id = progress_goals.child_id
      where tp.id = progress_goals.therapist_id and tp.user_id = auth.uid()
    )
  );

drop policy "therapist manages own session notes" on public.session_notes;
create policy "therapist manages own session notes" on public.session_notes
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      join public.bookings b on b.id = session_notes.booking_id and b.therapist_id = tp.id
      where tp.id = session_notes.therapist_id and tp.user_id = auth.uid()
    )
  );
