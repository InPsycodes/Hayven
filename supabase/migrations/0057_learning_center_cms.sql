-- Learning Center CMS: moves the ~60 hardcoded articles in
-- src/data/articles.ts into real, admin-editable content. Mirrors the
-- specialties table's "public lookup data" RLS shape (0002_rls.sql) for
-- reads, and the therapist_public_profiles grant pattern (0009) for
-- anon/authenticated access, since this content is public marketing/
-- educational material, not gated behind login.
--
-- Admin writes go through the service-role client (src/lib/learning/actions.ts,
-- same shape as src/lib/admin/actions.ts), re-checking session.role === 'admin'
-- in application code -- the "admins manage" policies below are defense in
-- depth, not the only gate, matching this codebase's existing convention.

create type learning_content_status as enum ('draft', 'published');

create table public.learning_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience text not null check (audience in ('parent', 'therapist')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name, audience)
);

create table public.learning_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  audience text not null check (audience in ('parent', 'therapist')),
  category_id uuid references public.learning_categories(id) on delete set null,
  title text not null,
  excerpt text not null,
  -- Array of paragraph strings -- same shape as the existing Article.body:
  -- string[] in src/data/articles.ts, so the migration script and the
  -- rendering component both need minimal changes.
  body jsonb not null default '[]'::jsonb,
  read_time text,
  reviewed_by text,
  image_url text,
  featured boolean not null default false,
  status learning_content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.learning_articles (audience, status);
create index on public.learning_articles (category_id);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.learning_articles(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now()
);
create index on public.learning_resources (article_id);

alter table public.learning_categories enable row level security;
alter table public.learning_articles enable row level security;
alter table public.learning_resources enable row level security;

-- ---------------------------------------------------------------------------
-- learning_categories -- public lookup data, admin-managed.
-- ---------------------------------------------------------------------------
create policy "anyone can read learning categories" on public.learning_categories
  for select using (true);
create policy "admins manage learning categories" on public.learning_categories
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- learning_articles -- only published rows are public; admins see/manage
-- everything including drafts.
-- ---------------------------------------------------------------------------
create policy "anyone can read published learning articles" on public.learning_articles
  for select using (status = 'published');
create policy "admins manage all learning articles" on public.learning_articles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- learning_resources -- inherits visibility from its parent article.
-- ---------------------------------------------------------------------------
create policy "anyone can read resources of published articles" on public.learning_resources
  for select using (
    exists (
      select 1 from public.learning_articles a
      where a.id = learning_resources.article_id and a.status = 'published'
    )
  );
create policy "admins manage learning resources" on public.learning_resources
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Grants -- RLS alone doesn't grant table access; every other public-read
-- table in this codebase pairs its policy with an explicit grant (see
-- 0009_public_therapist_view.sql). service_role isn't covered by the
-- blanket grant in 0005 for tables created after it, so it's re-granted
-- per new table here, same as every migration since then (e.g. 0052).
-- ---------------------------------------------------------------------------
grant select on public.learning_categories to anon, authenticated;
grant select on public.learning_articles to anon, authenticated;
grant select on public.learning_resources to anon, authenticated;
grant all privileges on public.learning_categories to service_role;
grant all privileges on public.learning_articles to service_role;
grant all privileges on public.learning_resources to service_role;
