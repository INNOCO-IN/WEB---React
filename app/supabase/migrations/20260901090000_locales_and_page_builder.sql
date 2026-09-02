-- Traditional Chinese, and the page-builder tables.
--
-- Two additions, both purely additive. Nothing existing is dropped or
-- rewritten, and the site runs unchanged against a database that has not had
-- this applied: the reads use `select *`, so a column that is not there is
-- simply absent and the copy falls back to English.

-- ========================================================================
-- 1. zh-TW copy on the content tables
--
-- A column per language, which is the convention `projects` and `communities`
-- set and `news`, `workshops`, `collectives` and `constellation_points`
-- followed. It is the wrong shape past a handful of languages — the page
-- builder's `page_localizations.content` below is the shape to move to — but
-- adding a third column beside two is cheaper than migrating the site's live
-- content mid-refactor, and the read layer already treats every language the
-- same way.
--
-- Nothing is backfilled. An untranslated field is null, and null means the
-- reader sees English rather than a hole. See `inLang` in
-- app/src/lib/content/types.ts.
-- ========================================================================

alter table public.news add column if not exists kind_zh_tw    text;
alter table public.news add column if not exists eyebrow_zh_tw text;
alter table public.news add column if not exists title_zh_tw   text;
alter table public.news add column if not exists body_zh_tw    text;

-- `audience` stays the grouping key in every language — the filter chips match
-- on it — and `audience_zh_tw` is only what the chip is labelled.
alter table public.workshops add column if not exists title_zh_tw    text;
alter table public.workshops add column if not exists eyebrow_zh_tw  text;
alter table public.workshops add column if not exists blurb_zh_tw    text;
alter table public.workshops add column if not exists audience_zh_tw text;
alter table public.workshops add column if not exists duration_zh_tw text;
alter table public.workshops add column if not exists cta_zh_tw      text;

alter table public.projects add column if not exists title_zh_tw   text;
alter table public.projects add column if not exists eyebrow_zh_tw text;
alter table public.projects add column if not exists body_zh_tw    text;

alter table public.communities add column if not exists title_zh_tw   text;
alter table public.communities add column if not exists meta_zh_tw    text;
alter table public.communities add column if not exists eyebrow_zh_tw text;
alter table public.communities add column if not exists body_zh_tw    text;

alter table public.collectives add column if not exists name_zh_tw      text;
alter table public.collectives add column if not exists one_liner_zh_tw text;
alter table public.collectives add column if not exists full_bio_zh_tw  text;
alter table public.collectives add column if not exists role_zh_tw      text;

-- `topic_zh_tw` labels a cluster without defining it — `topic` is the grouping
-- key. `format` is a fixed vocabulary keyed to the colour scale, translated in
-- the app rather than per row.
alter table public.constellation_points add column if not exists title_zh_tw   text;
alter table public.constellation_points add column if not exists by_line_zh_tw text;
alter table public.constellation_points add column if not exists caption_zh_tw text;
alter table public.constellation_points add column if not exists topic_zh_tw   text;

-- ========================================================================
-- 2. Page builder
--
-- Base page and localized page, split into two tables, because that split is
-- the whole point of the model: the element tree, the colours and the spacing
-- are decided once, and only the words are written per language.
--
-- `shared_document` and `document_override` hold a page document —
-- `{ "nodes": [...] }` where every node is `{ id, type, props, bindings,
-- children }`. `type` is a key into the app's element registry, never a
-- component name or a path, so nothing stored here can name code to run. The
-- check constraints below enforce the shape Postgres can see; the app
-- validates element types on read, since only the build knows what is
-- registered.
-- ========================================================================

create table if not exists public.pages (
  id             text primary key,             -- 'page_news' — stable, never derived from a slug
  route_key      text not null unique,         -- 'news' — stable across languages and slug changes
  default_locale text not null default 'en',
  shared_document jsonb not null default '{"nodes": []}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.pages
  drop constraint if exists pages_default_locale_supported;
alter table public.pages
  add constraint pages_default_locale_supported
  check (default_locale in ('en', 'zh-TW', 'ko'));

alter table public.pages
  drop constraint if exists pages_shared_document_shape;
alter table public.pages
  add constraint pages_shared_document_shape
  check (jsonb_typeof(shared_document -> 'nodes') = 'array');

create table if not exists public.page_localizations (
  id                text primary key default gen_random_uuid()::text,
  page_id           text not null references public.pages (id) on delete cascade,
  locale            text not null,
  slug              text not null,
  seo               jsonb not null default '{}'::jsonb,
  content           jsonb not null default '{}'::jsonb,
  document_override jsonb,
  status            text not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One record per language per page. Without this, two half-finished Korean
-- records for the same page would both be "the" Korean record, and which one
-- rendered would depend on row order.
create unique index if not exists page_localizations_page_locale_key
  on public.page_localizations (page_id, locale);

-- A slug has to be unique within its language, not across all of them: `/news`
-- and `/ko/news` are different URLs and may legitimately share a slug.
create unique index if not exists page_localizations_locale_slug_key
  on public.page_localizations (locale, slug);

alter table public.page_localizations
  drop constraint if exists page_localizations_locale_supported;
alter table public.page_localizations
  add constraint page_localizations_locale_supported
  check (locale in ('en', 'zh-TW', 'ko'));

alter table public.page_localizations
  drop constraint if exists page_localizations_status_valid;
alter table public.page_localizations
  add constraint page_localizations_status_valid
  check (status in ('draft', 'published'));

alter table public.page_localizations
  drop constraint if exists page_localizations_slug_present;
alter table public.page_localizations
  add constraint page_localizations_slug_present
  check (length(btrim(slug)) > 0);

alter table public.page_localizations
  drop constraint if exists page_localizations_override_shape;
alter table public.page_localizations
  add constraint page_localizations_override_shape
  check (document_override is null or jsonb_typeof(document_override -> 'nodes') = 'array');

create index if not exists page_localizations_published_idx
  on public.page_localizations (locale, status);

-- ---------- Row level security ----------
-- The anon key reads published localizations and the pages they belong to, and
-- writes nothing. Drafts are invisible to the public site, which is what makes
-- per-locale publishing mean anything: a page can be live in English while its
-- Korean translation is still being written.
--
-- Editing is a service-role or authenticated-editor concern, and there is no
-- editor role in this project yet — so no write policy is granted here rather
-- than granting one that is wider than it should be.

alter table public.pages enable row level security;
alter table public.page_localizations enable row level security;

drop policy if exists "anon reads pages" on public.pages;
create policy "anon reads pages" on public.pages
  for select to anon using (
    exists (
      select 1 from public.page_localizations pl
      where pl.page_id = pages.id and pl.status = 'published'
    )
  );

drop policy if exists "anon reads published localizations" on public.page_localizations;
create policy "anon reads published localizations" on public.page_localizations
  for select to anon using (status = 'published');

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_touch_updated_at on public.pages;
create trigger pages_touch_updated_at before update on public.pages
  for each row execute function public.touch_updated_at();

drop trigger if exists page_localizations_touch_updated_at on public.page_localizations;
create trigger page_localizations_touch_updated_at before update on public.page_localizations
  for each row execute function public.touch_updated_at();

-- ---------- Realtime ----------
-- The site subscribes per table, so a page edited in the Table Editor reaches
-- an open tab without a reload — the same contract every other content table
-- already has.
alter table public.pages replica identity full;
alter table public.page_localizations replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pages'
    ) then
      alter publication supabase_realtime add table public.pages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'page_localizations'
    ) then
      alter publication supabase_realtime add table public.page_localizations;
    end if;
  end if;
end
$$;
