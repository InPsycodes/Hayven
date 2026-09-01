-- Parent reviews of a therapist. One row per (parent, therapist), editable;
-- writing one requires at least one completed booking between them (same
-- booking-established-relationship rule the assignment policies use, e.g.
-- 0062). Reviews are shown without a name -- "Verified parent" + date --
-- so the public read never needs to reach the users table, and small pilot
-- communities don't out each other.
--
-- Moderation for now is a single `hidden` flag an admin can set. Aggregates
-- (average, count) are computed in queries, not materialised.

create table public.therapist_reviews (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  parent_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index therapist_reviews_parent_therapist_uniq
  on public.therapist_reviews (parent_id, therapist_id);
create index therapist_reviews_visible_idx
  on public.therapist_reviews (therapist_id) where hidden = false;

alter table public.therapist_reviews enable row level security;

-- Public read of visible reviews (the therapist profile page is a marketing
-- route, served to anon); a parent can always see their own, hidden or not,
-- so the edit form can load it back.
create policy "anyone reads visible reviews" on public.therapist_reviews
  for select using (hidden = false or parent_id = auth.uid());

-- A parent may write one review per therapist, only after a completed
-- session. Same `exists (... bookings ...)` shape as 0062's assignment
-- policy -- runs under the parent's own privileges, and "parent views own
-- bookings" (0002) already lets that subquery see the row.
create policy "parent writes own review after a completed session" on public.therapist_reviews
  for insert with check (
    parent_id = auth.uid()
    and hidden = false
    and exists (
      select 1 from public.bookings b
      where b.parent_id = auth.uid()
        and b.therapist_id = therapist_reviews.therapist_id
        and b.status = 'completed'
    )
  );

create policy "parent updates own review" on public.therapist_reviews
  for update using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "parent deletes own review" on public.therapist_reviews
  for delete using (parent_id = auth.uid());

create policy "admins manage reviews" on public.therapist_reviews
  for all using (public.current_user_role() = 'admin');

grant select on public.therapist_reviews to anon;
grant select, insert, update, delete on public.therapist_reviews to authenticated;
grant all privileges on public.therapist_reviews to service_role;
