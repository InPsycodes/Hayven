-- Row Level Security -- the database-level backstop for the non-negotiables
-- called out in the handoff docs: parents/therapists only see their own case
-- data, admin endpoints are role-gated, reviewer_notes never reaches a
-- parent or therapist. Application code should still check ownership too
-- (defense in depth) -- this is the layer that holds even if it doesn't.

create function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

alter table public.users enable row level security;
alter table public.children enable row level security;
alter table public.specialties enable row level security;
alter table public.therapist_profiles enable row level security;
alter table public.therapist_specialties enable row level security;
alter table public.credentials enable row level security;
alter table public.verification_requests enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.messages enable row level security;
alter table public.session_notes enable row level security;
alter table public.progress_goals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create policy "users can view own profile" on public.users
  for select using (id = auth.uid());
create policy "admins can view all profiles" on public.users
  for select using (public.current_user_role() = 'admin');
create policy "users can update own profile" on public.users
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------------

create policy "parents manage own children" on public.children
  for all using (parent_id = auth.uid());
create policy "assigned therapists can view children" on public.children
  for select using (
    exists (
      select 1 from public.bookings b
      join public.therapist_profiles tp on tp.id = b.therapist_id
      where b.child_id = children.id and tp.user_id = auth.uid()
    )
  );
create policy "admins view all children" on public.children
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- specialties (public lookup data)
-- ---------------------------------------------------------------------------

create policy "anyone can read specialties" on public.specialties
  for select using (true);

-- ---------------------------------------------------------------------------
-- therapist_profiles
-- ---------------------------------------------------------------------------

create policy "public can view verified therapists" on public.therapist_profiles
  for select using (verification_status = 'verified');
create policy "therapist manages own profile" on public.therapist_profiles
  for all using (user_id = auth.uid());
create policy "admins view all therapist profiles" on public.therapist_profiles
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- therapist_specialties
-- ---------------------------------------------------------------------------

create policy "anyone can read therapist specialties" on public.therapist_specialties
  for select using (true);
create policy "therapist manages own specialties" on public.therapist_specialties
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = therapist_specialties.therapist_id and tp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- credentials -- never public; owner + admin only
-- ---------------------------------------------------------------------------

create policy "therapist manages own credentials" on public.credentials
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = credentials.therapist_id and tp.user_id = auth.uid()
    )
  );
create policy "admins view all credentials" on public.credentials
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- verification_requests -- reviewer_notes is column-restricted below
-- ---------------------------------------------------------------------------

create policy "therapist views own verification requests" on public.verification_requests
  for select using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = verification_requests.therapist_id and tp.user_id = auth.uid()
    )
  );
create policy "admins manage verification requests" on public.verification_requests
  for all using (public.current_user_role() = 'admin');

-- reviewer_notes is internal-only: revoke column access for normal clients.
-- Admin server code must use the service-role key (bypasses RLS/grants) to
-- read it -- never the anon/authenticated client, even for an admin user.
revoke select (reviewer_notes) on public.verification_requests from authenticated, anon;

-- ---------------------------------------------------------------------------
-- availability_slots -- public read (browsing), therapist manages own
-- ---------------------------------------------------------------------------

create policy "anyone can view availability" on public.availability_slots
  for select using (true);
create policy "therapist manages own availability" on public.availability_slots
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = availability_slots.therapist_id and tp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

create policy "parent views own bookings" on public.bookings
  for select using (parent_id = auth.uid());
create policy "therapist views own bookings" on public.bookings
  for select using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = bookings.therapist_id and tp.user_id = auth.uid()
    )
  );
create policy "parent creates own bookings" on public.bookings
  for insert with check (parent_id = auth.uid());
create policy "parent updates own bookings" on public.bookings
  for update using (parent_id = auth.uid());
create policy "therapist updates own bookings" on public.bookings
  for update using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = bookings.therapist_id and tp.user_id = auth.uid()
    )
  );
create policy "admins manage all bookings" on public.bookings
  for all using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- payments -- reads only for participants; writes are service-role only
-- (webhook/server code), intentionally no insert/update policy here
-- ---------------------------------------------------------------------------

create policy "users view own payments" on public.payments
  for select using (payer_id = auth.uid() or payee_id = auth.uid());
create policy "admins view all payments" on public.payments
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- messages -- booking participants only, per the cross-cutting security
-- requirement (re-check the requester is the actual parent/therapist on
-- *that* booking, not just "any parent"/"any therapist")
-- ---------------------------------------------------------------------------

create policy "booking participants view messages" on public.messages
  for select using (
    exists (
      select 1 from public.bookings b
      left join public.therapist_profiles tp on tp.id = b.therapist_id
      where b.id = messages.booking_id
        and (b.parent_id = auth.uid() or tp.user_id = auth.uid())
    )
  );
create policy "booking participants send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      left join public.therapist_profiles tp on tp.id = b.therapist_id
      where b.id = messages.booking_id
        and (b.parent_id = auth.uid() or tp.user_id = auth.uid())
    )
  );
create policy "admins view all messages" on public.messages
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- session_notes -- author therapist always; parent only if visible_to_parent
-- ---------------------------------------------------------------------------

create policy "therapist manages own session notes" on public.session_notes
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = session_notes.therapist_id and tp.user_id = auth.uid()
    )
  );
create policy "parent views visible session notes" on public.session_notes
  for select using (
    visible_to_parent = true
    and exists (
      select 1 from public.bookings b
      where b.id = session_notes.booking_id and b.parent_id = auth.uid()
    )
  );
create policy "admins view all session notes" on public.session_notes
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- progress_goals -- parent of the child, treating therapist
-- ---------------------------------------------------------------------------

create policy "parent views child progress goals" on public.progress_goals
  for select using (
    exists (
      select 1 from public.children c
      where c.id = progress_goals.child_id and c.parent_id = auth.uid()
    )
  );
create policy "therapist manages own progress goals" on public.progress_goals
  for all using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = progress_goals.therapist_id and tp.user_id = auth.uid()
    )
  );
create policy "admins view all progress goals" on public.progress_goals
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------

create policy "parent manages own subscription" on public.subscriptions
  for all using (parent_id = auth.uid());
create policy "admins view all subscriptions" on public.subscriptions
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create policy "user manages own notifications" on public.notifications
  for all using (user_id = auth.uid());
