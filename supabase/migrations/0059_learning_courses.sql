-- Learning Center V2, trimmed: courses/modules structure + per-user
-- completion tracking for the *therapist* Learning Center specifically
-- (the parent Learning Center stays flat articles -- courses were only
-- ever asked for on the therapist side). Quizzes, a clinical-review
-- workflow, content scheduling, and analytics are deliberately deferred,
-- same reasoning as cutting them from Learning Center V1.
--
-- Reuses learning_content_status (draft/published) from
-- 0057_learning_center_cms.sql instead of redefining it, and
-- learning_categories for course categorization.
--
-- Unlike learning_articles (public marketing content, anon-readable),
-- courses are therapist professional-development material behind login --
-- readable by therapists and admins only, never anon or parent.

create table public.learning_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id uuid references public.learning_categories(id) on delete set null,
  title text not null,
  description text not null,
  status learning_content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.learning_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses(id) on delete cascade,
  title text not null,
  -- Array of paragraph strings, same shape as learning_articles.body.
  body jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.learning_lessons (course_id, sort_order);

-- Completion is a discrete event (a row exists or it doesn't), not a
-- status field to keep in sync -- marking a lesson incomplete again is a
-- delete, not an update.
create table public.learning_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index on public.learning_lesson_progress (user_id);

alter table public.learning_courses enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_lesson_progress enable row level security;

-- ---------------------------------------------------------------------------
-- learning_courses
-- ---------------------------------------------------------------------------
create policy "therapists and admins read published courses" on public.learning_courses
  for select using (
    status = 'published' and public.current_user_role() in ('therapist', 'admin')
  );
create policy "admins manage all courses" on public.learning_courses
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- learning_lessons -- inherits visibility from its parent course, same
-- pattern as learning_resources in 0057.
-- ---------------------------------------------------------------------------
create policy "therapists and admins read lessons of published courses" on public.learning_lessons
  for select using (
    public.current_user_role() in ('therapist', 'admin')
    and exists (
      select 1 from public.learning_courses c
      where c.id = learning_lessons.course_id and c.status = 'published'
    )
  );
create policy "admins manage all lessons" on public.learning_lessons
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- learning_lesson_progress -- a user manages only their own rows; admins
-- get read access for future course-completion visibility, same "defense
-- in depth, not the only gate" reasoning as everywhere else.
-- ---------------------------------------------------------------------------
create policy "user manages own lesson progress" on public.learning_lesson_progress
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "admins view all lesson progress" on public.learning_lesson_progress
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Grants -- courses/lessons are NOT granted to anon (unlike
-- learning_articles): this content sits behind login, so there's no public-
-- read case to support. service_role re-granted per table, same as every
-- migration since 0005 (that blanket grant only covered tables that
-- existed at the time it ran).
-- ---------------------------------------------------------------------------
grant select on public.learning_courses to authenticated;
grant select on public.learning_lessons to authenticated;
grant select, insert, delete on public.learning_lesson_progress to authenticated;
grant all privileges on public.learning_courses to service_role;
grant all privileges on public.learning_lessons to service_role;
grant all privileges on public.learning_lesson_progress to service_role;
