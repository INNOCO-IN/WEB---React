-- IN Website — Supabase schema
-- Paste into Supabase → SQL Editor → Run.

-- ========== 1. Connect form (Are you IN?) ==========
create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  brings      text,
  message     text,
  source_page text,
  status      text not null default 'new'   -- new | contacted | archived
);

-- ========== 2. Story submissions ==========
create table if not exists public.stories (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  door           text,                       -- 'I lived it' | 'I noticed it'
  body           text not null,              -- the story itself
  format         text[] default '{}',        -- Writing, Drawing, Photo, ...
  arc_stage      text,                       -- IGNITE | ME ≠ WE | ... | Let IN place it
  credit_name    text,                       -- blank = anonymous
  email          text,
  consent        boolean not null default false,
  attachment_url text,
  source_page    text,
  status         text not null default 'pending'  -- pending | published | declined
);

create index if not exists stories_published_idx
  on public.stories (status, created_at desc);

-- ========== 2b. Workshop registrations ==========
-- The intake table for a workshop sign-up form, from the round before the
-- React port — the same round that created `workshops` with an `id` column to
-- fill that form's dropdown, which is why the live `workshops` still carries
-- both `id` and `slug`.
--
-- On the live database `workshop_id` has a foreign key to `workshops.id`. It is
-- not declared here, because §5b creates `workshops` with `slug` as its only
-- key — the `id` column exists solely on the database that predates the port,
-- which `create table if not exists` left in place. Declaring the FK would make
-- this file fail on the fresh database it is supposed to build. Reconcile the
-- two shapes before relying on the reference; until then the form has
-- `workshop_slug`, which `workshops.slug` does key.
--
-- It is in the linked database and was in neither this file nor a migration,
-- so a database built from `npm run supabase-setup` did not have it. Declared
-- here so that stops being true. **The column list is reconstructed from the
-- generated types** (`app/src/lib/database.types.ts`), not from the original
-- DDL, so defaults and constraints are a best guess — check it against the
-- live table before trusting this on a database that matters.
--
-- The React app posts to it: `components/WorkshopRegister` is the form in the
-- `#register` band of every workshop detail page, and `workshop_slug` is the
-- page it was sent from. `site/` does not — those pages still carry only
-- `data-in-form="submissions"` and `="stories"`, so a sign-up made on the
-- static site is still an enquiry.
create table if not exists public.workshop_registrations (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text not null,
  email          text not null,
  org            text,
  message        text,
  workshop_slug  text,                       -- what the form submitted
  workshop_id    uuid,                       -- see note above: no FK here
  source_page    text,
  status         text not null default 'new' -- new | contacted | archived
);

-- ========== 2c. Staff allowlist ==========
-- One email per member of staff. Nothing in this repo reads it; a single-column
-- email table is the shape an RLS policy uses to decide who may read the form
-- intake, and the policy that does so is not in this repo either.
--
-- So this declares the table and grants nothing. RLS on with no policy means
-- anon can neither read nor write it, which is the only safe default for an
-- allowlist — the service role bypasses RLS, so anything server-side that
-- reads it keeps working. If the live database has a policy here, it is not
-- named below and is left alone.
-- No addresses here. `is_staff()` is false for everybody until the list is
-- bootstrapped, and who has admin access is per-deployment rather than part of
-- the schema — so it lives in `seed-staff.sql`, which is gitignored the way
-- `.env.local` is, and which `npm run supabase-setup` folds in when present.
create table if not exists public.staff_emails (
  email text primary key
);

alter table public.staff_emails enable row level security;

-- ========== 2d. Staff access to the intake tables ==========
-- Who may read what visitors sent, and move it through review.
--
-- The allowlist above is the list; this is what consults it. A policy cannot
-- simply select from `staff_emails`, because that select is subject to
-- `staff_emails`' own RLS, which denies everyone — so the check goes through a
-- `security definer` function, which runs as the function's owner and can see
-- the table. `set search_path` is not optional on such a function: without it a
-- caller can point `public` at a schema of their own and decide for themselves
-- what `staff_emails` means.
--
-- Execute is granted to `authenticated` alone. `anon` never needs to ask
-- whether it is staff, and being able to ask is a way of testing the list.
create or replace function public.is_staff() returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.staff_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Read and review, not delete. A submission is someone's account of something
-- that happened to them; declining it is a status, not an erasure, and the row
-- stays for whoever has to answer for that decision later.
drop policy if exists "staff read stories" on public.stories;
create policy "staff read stories" on public.stories
  for select to authenticated using (public.is_staff());

drop policy if exists "staff review stories" on public.stories;
create policy "staff review stories" on public.stories
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read submissions" on public.submissions;
create policy "staff read submissions" on public.submissions
  for select to authenticated using (public.is_staff());

drop policy if exists "staff review submissions" on public.submissions;
create policy "staff review submissions" on public.submissions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read registrations" on public.workshop_registrations;
create policy "staff read registrations" on public.workshop_registrations
  for select to authenticated using (public.is_staff());

drop policy if exists "staff review registrations" on public.workshop_registrations;
create policy "staff review registrations" on public.workshop_registrations
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Staff may read the allowlist itself, so the review page can tell someone who
-- signed in and is not on it apart from someone whose session simply expired.
drop policy if exists "staff read allowlist" on public.staff_emails;
create policy "staff read allowlist" on public.staff_emails
  for select to authenticated using (public.is_staff());

-- ========== 3. Row Level Security: public can submit, not read ==========
alter table public.submissions enable row level security;
alter table public.stories     enable row level security;

drop policy if exists "anon can submit" on public.submissions;
create policy "anon can submit" on public.submissions
  for insert to anon, authenticated with check (true);

drop policy if exists "anon can submit story" on public.stories;
create policy "anon can submit story" on public.stories
  for insert to anon, authenticated with check (true);

-- Same rule for the workshop sign-up: anyone may register, nobody may read
-- back who else did.
alter table public.workshop_registrations enable row level security;

drop policy if exists "anon can register" on public.workshop_registrations;
create policy "anon can register" on public.workshop_registrations
  for insert to anon, authenticated with check (true);

-- Published stories are readable by anon, so a reviewed submission can reach the
-- site. Nothing renders them yet: `useStories` exists and no page calls it, and
-- the Story index reads the curated `story_entries` instead — an editor copies
-- a published submission across by hand. This policy is what a direct
-- submission-to-page path would be built on.
drop policy if exists "anon reads published" on public.stories;
create policy "anon reads published" on public.stories
  for select to anon, authenticated using (status = 'published');

-- ========== 4. Storage bucket for attachments ==========
insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

drop policy if exists "anon uploads story media" on storage.objects;
create policy "anon uploads story media" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'story-media');

drop policy if exists "public reads story media" on storage.objects;
create policy "public reads story media" on storage.objects
  for select to public using (bucket_id = 'story-media');

-- ========================================================================
-- 5. Editorial content
--
-- Everything below is content the site *reads*. Sections 1–4 are content the
-- site *writes* (form submissions), which is why the policies differ: these
-- tables are world-readable for rows marked live, and writable only from the
-- Supabase dashboard.
--
-- `accent` holds a design-token name — 'magenta', 'tan', 'slate' — not a hex
-- value. The colour belongs to the design system, so changing the token
-- changes every card using it. A raw '#RRGGBB' still works where a piece of
-- content genuinely needs one.
--
-- `route` and `link` hold app paths ('/workshop/mobius-making'), so editors
-- never have to know a component name. External URLs are allowed in `link`.
--
-- Seed all four from app/scripts/extract-content.mjs → seed.sql.
-- ========================================================================

-- ---------- 5a. News, insight and upcoming ----------
-- One row per card. `feeds` decides where it appears: the News page, the
-- Home grid, the Community page, or more than one at once.
create table if not exists public.news (
  id           text primary key,              -- 'COMM/NEWS/1' — kept from the content register
  created_at   timestamptz not null default now(),
  published_at date,                          -- the date the item is about
  feeds        text[] not null default '{}',  -- home | news | community | story | project
  kind         text,                          -- Upcoming | Milestone | Recap | Launch | Press | …
  eyebrow      text,                          -- place or cadence, shown above the title
  title        text not null,
  body         text,
  image        text,                          -- '/community-img/x.jpg' or an absolute URL
  accent       text,
  link         text,
  credit       text,                          -- required for Unsplash imagery
  credit_href  text,
  sort_order   int not null default 0,
  status       text not null default 'draft'  -- draft | live | archived
);

create index if not exists news_live_idx on public.news (status, published_at desc);

-- Korean and Traditional Chinese copy, as on projects. Nullable and
-- unbackfilled: the site falls back to English field by field, so translating
-- one headline does not oblige anyone to translate its blurb in the same
-- sitting. See `inLang` in app/src/lib/content/types.ts.
--
-- A column per language does not scale past a handful of them, and the page
-- builder's per-locale content records are where this goes when the fourth
-- language arrives. The zh-TW columns landed as a migration first; they are
-- restated here because this file, not the migration folder, is the schema.
alter table public.news add column if not exists kind_ko    text;
alter table public.news add column if not exists eyebrow_ko text;
alter table public.news add column if not exists title_ko   text;
alter table public.news add column if not exists body_ko    text;

alter table public.news add column if not exists kind_zh_tw    text;
alter table public.news add column if not exists eyebrow_zh_tw text;
alter table public.news add column if not exists title_zh_tw   text;
alter table public.news add column if not exists body_zh_tw    text;

-- ---------- 5b. Workshops ----------
-- Drives the Workshop index cards and the audience filter. The individual
-- Workshop-* pages keep their own long-form copy in the app; this is the
-- card-level content plus the ordering.
--
-- This table may already exist: an earlier round created it with just
-- (id, created_at, slug, title, active, sort_order) to feed an intake form's
-- dropdown. `create table if not exists` would silently leave that version in
-- place, so the card columns are added separately below — which is a no-op on
-- a table that already has them.
create table if not exists public.workshops (
  slug        text primary key,               -- 'mobius-making'
  created_at  timestamptz not null default now(),
  title       text not null,
  active      boolean not null default true,
  sort_order  int not null default 0
);

alter table public.workshops add column if not exists eyebrow  text;
alter table public.workshops add column if not exists blurb    text;
alter table public.workshops add column if not exists audience text;  -- For All | Parents | Organizations | Youth | Women
alter table public.workshops add column if not exists duration text;
alter table public.workshops add column if not exists accent   text;
alter table public.workshops add column if not exists ink      text not null default 'ink';  -- ink | paper
alter table public.workshops add column if not exists route    text;
alter table public.workshops add column if not exists featured boolean not null default false;
alter table public.workshops add column if not exists cta      text default 'Explore';

-- Korean copy. `audience` stays the grouping key in both languages — the
-- filter chips match on it — and `audience_ko` is only the chip's label.
alter table public.workshops add column if not exists title_ko    text;
alter table public.workshops add column if not exists eyebrow_ko  text;
alter table public.workshops add column if not exists blurb_ko    text;
alter table public.workshops add column if not exists audience_ko text;
alter table public.workshops add column if not exists duration_ko text;
alter table public.workshops add column if not exists cta_ko      text;
alter table public.workshops add column if not exists title_zh_tw    text;
alter table public.workshops add column if not exists eyebrow_zh_tw  text;
alter table public.workshops add column if not exists blurb_zh_tw    text;
alter table public.workshops add column if not exists audience_zh_tw text;
alter table public.workshops add column if not exists duration_zh_tw text;
alter table public.workshops add column if not exists cta_zh_tw      text;

-- Older copies of this table have a uuid id and only a unique constraint on
-- slug. The seed upserts on slug either way, so both shapes work.
create unique index if not exists workshops_slug_key on public.workshops (slug);

-- ---------- 5c. Projects ----------
-- The project index cards and the shared index rail.
create table if not exists public.projects (
  slug        text primary key,
  created_at  timestamptz not null default now(),
  title       text not null,
  meta        text,                           -- the rail's short line: 'Sharjah · 2017'
  eyebrow     text,
  body        text,
  image       text,
  accent      text,
  route       text,
  started_on  date,
  sort_order  int not null default 0,
  status      text not null default 'live'
);

-- `featured` is the one project the index page gives its own block to, so the
-- card wall below leaves it out. Same column, same meaning, as on workshops.
alter table public.projects add column if not exists featured boolean not null default false;

-- Korean copy, on the row rather than in a second table: a project is one
-- thing described twice, the way `story_entries` carries `en` and `ko`. Null
-- means nobody has translated that field, and the card falls back to English
-- rather than showing a hole.
alter table public.projects add column if not exists title_ko   text;
alter table public.projects add column if not exists eyebrow_ko text;
alter table public.projects add column if not exists body_ko    text;
alter table public.projects add column if not exists title_zh_tw   text;
alter table public.projects add column if not exists eyebrow_zh_tw text;
alter table public.projects add column if not exists body_zh_tw    text;

-- ---------- 5d. Communities ----------
-- The circles on /community, and the directory on /community/all. A circle's
-- `route` is not always a community page: two of them are the community a
-- project left behind, and point at the project.
create table if not exists public.communities (
  slug        text primary key,
  created_at  timestamptz not null default now(),
  title       text not null,
  eyebrow     text,
  body        text,
  image       text,
  accent      text,
  route       text,
  sort_order  int not null default 0,
  status      text not null default 'live'
);

-- `meta` is the directory's right-hand line: 'Online · Resuming soon',
-- 'On hold · Archive'. It says where a circle stands, which the card's
-- eyebrow ('Community', on all of them) does not.
alter table public.communities add column if not exists meta text;

-- Korean copy, as on projects. `meta_ko` exists here and not there because the
-- directory is an English-only page but the circles grid is not, and the grid
-- shows this line.
alter table public.communities add column if not exists title_ko   text;
alter table public.communities add column if not exists meta_ko    text;
alter table public.communities add column if not exists eyebrow_ko text;
alter table public.communities add column if not exists body_ko    text;
alter table public.communities add column if not exists title_zh_tw   text;
alter table public.communities add column if not exists meta_zh_tw    text;
alter table public.communities add column if not exists eyebrow_zh_tw text;
alter table public.communities add column if not exists body_zh_tw    text;

-- ---------- 5e. Read policies ----------
-- Both Data API roles may read live rows and nothing else.
--
-- `authenticated` is named alongside `anon` because signing in must not take the
-- site away. A reviewer who signed in at /review is still a reader of the public
-- pages, and a policy admitting `anon` alone answers them 200 with zero rows —
-- which the app cannot tell apart from an empty table, so every page quietly
-- falls back to its bundled copy and stays there until they sign out. Silent is
-- the whole problem: nothing errors, nothing logs, the content is just old.
--
-- There is still no insert or update for either role: editorial content is
-- changed in the Supabase dashboard, so a leaked key of either kind can never
-- rewrite the site's copy.
alter table public.news        enable row level security;
alter table public.workshops   enable row level security;
alter table public.projects    enable row level security;
alter table public.communities enable row level security;

drop policy if exists "anon reads live news" on public.news;
create policy "anon reads live news" on public.news
  for select to anon, authenticated using (status = 'live');

drop policy if exists "anon reads active workshops" on public.workshops;
create policy "anon reads active workshops" on public.workshops
  for select to anon, authenticated using (active = true);

drop policy if exists "anon reads live projects" on public.projects;
create policy "anon reads live projects" on public.projects
  for select to anon, authenticated using (status = 'live');

drop policy if exists "anon reads live communities" on public.communities;
create policy "anon reads live communities" on public.communities
  for select to anon, authenticated using (status = 'live');

-- ---------- 5f. Story entries ----------
-- The curated story collection — what site/data/stories.js held as two globals
-- on a <script> tag. One row per story, both languages on the row, because a
-- story is one thing told twice rather than two stories.
--
-- Distinct from `stories` in section 2: that table receives what visitors
-- submit and holds it for review. A submission that gets published is copied
-- here by an editor, with a slug, a topic and a format.
create table if not exists public.story_entries (
  id             text primary key,             -- stable slug; this is the permalink
  created_at     timestamptz not null default now(),
  published_on   date not null,
  format         text not null,                -- writing | drawing | photo | video | …
  topic          text not null,
  color          text,                         -- plate colour when there is no photo
  href           text,                         -- destination page; null reads inline
  draft          boolean not null default false,
  image          text,
  image_fit      text,
  image_ratio    text,
  image_position text,
  en             jsonb not null,               -- { eyebrow, title, body, credit, paras[], kicker[] }
  ko             jsonb not null
);

create index if not exists story_entries_date_idx on public.story_entries (published_on desc);

alter table public.story_entries enable row level security;

drop policy if exists "anon reads story entries" on public.story_entries;
create policy "anon reads story entries" on public.story_entries
  for select to anon, authenticated using (true);

-- ---------- 5g. Constellation points ----------
-- The lights on the Constellation map. A superset of story_entries: every
-- point is something someone made, but a point also records who it came from
-- and up to three ways to follow it — read it, watch/listen, or view the image.
create table if not exists public.constellation_points (
  id          text primary key,
  created_at  timestamptz not null default now(),
  title       text not null,
  by_line     text,                            -- often 'Anonymous', which is the point
  format      text not null,                   -- keys the colour scale and one grouping mode
  topic       text not null,
  arc         text,                            -- position on the MEWE loop, once placed
  month       text not null,                   -- yyyy-mm; points are placed by month
  caption     text,
  read_href   text,
  media_href  text,
  view_href   text
);

-- Korean copy. `topic_ko` labels a cluster without defining it — `topic` is
-- the grouping key. `format` is a fixed vocabulary keyed to the colour scale,
-- so it is translated in the app rather than per row.
alter table public.constellation_points add column if not exists title_ko   text;
alter table public.constellation_points add column if not exists by_line_ko text;
alter table public.constellation_points add column if not exists caption_ko text;
alter table public.constellation_points add column if not exists topic_ko   text;
alter table public.constellation_points add column if not exists title_zh_tw   text;
alter table public.constellation_points add column if not exists by_line_zh_tw text;
alter table public.constellation_points add column if not exists caption_zh_tw text;
alter table public.constellation_points add column if not exists topic_zh_tw   text;

alter table public.constellation_points enable row level security;

drop policy if exists "anon reads constellation" on public.constellation_points;
create policy "anon reads constellation" on public.constellation_points
  for select to anon, authenticated using (true);

-- ---------- 5h. IN-Collectives ----------
-- The roster on /collectives: the people who carry MEWE into their own
-- communities. Distinct from `communities` — that table holds the circles,
-- this one holds the individuals, one row per person.
--
-- `num` is the primary key rather than a uuid because the number *is* the
-- identity here: the page shows it, the roster is ordered by it, and it is
-- how someone refers to a collective ("#05"). Zero-padded, so a plain text
-- sort puts them in order.
create table if not exists public.collectives (
  num         text primary key,             -- '01' upward — number and sort key
  created_at  timestamptz not null default now(),
  name        text not null,
  photo       text,                         -- '/team/01_Yunsun.jpg'; null renders the blank plate
  one_liner   text,                         -- the line the card shows closed
  full_bio    text,                         -- what "More +" opens
  role        text,                         -- null for most; the founder carries one
  status      text not null default 'live'  -- draft | live | archived
);

-- Korean copy, as on the other registers.
alter table public.collectives add column if not exists name_ko      text;
alter table public.collectives add column if not exists one_liner_ko text;
alter table public.collectives add column if not exists full_bio_ko  text;
alter table public.collectives add column if not exists role_ko      text;
alter table public.collectives add column if not exists name_zh_tw      text;
alter table public.collectives add column if not exists one_liner_zh_tw text;
alter table public.collectives add column if not exists full_bio_zh_tw  text;
alter table public.collectives add column if not exists role_zh_tw      text;

alter table public.collectives enable row level security;


drop policy if exists "anon reads live collectives" on public.collectives;
create policy "anon reads live collectives" on public.collectives
  for select to anon, authenticated using (status = 'live');

-- ========================================================================
-- 6. Page builder
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
--
-- Provisioned, not yet used: `app/src/builder/` renders from a bundled page
-- document and `BUILDER_SERVES` is empty, so nothing queries these two tables
-- yet. They are here because this file, not the migration folder, is what
-- `npm run supabase-setup` pastes — a database built that way was missing them.
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
  for select to anon, authenticated using (
    exists (
      select 1 from public.page_localizations pl
      where pl.page_id = pages.id and pl.status = 'published'
    )
  );

drop policy if exists "anon reads published localizations" on public.page_localizations;
create policy "anon reads published localizations" on public.page_localizations
  for select to anon, authenticated using (status = 'published');

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

-- ========================================================================
-- 7. Realtime
--
-- Content the site reads is broadcast as it changes, so an edit in the Table
-- Editor reaches an open page without a reload. The site subscribes per
-- table, and only for tables the page in front of you actually reads.
--
-- Two things are needed per table, and this block is safe to re-run:
--
--   replica identity full  — an UPDATE or DELETE otherwise carries only the
--                            primary key of the old row, so a row leaving
--                            `status = 'live'` would arrive as a change the
--                            site could not attribute to anything.
--   the publication        — `supabase_realtime` is what the Realtime server
--                            listens to. A table not in it is silent: no
--                            error, no events, and a page that only updates
--                            on reload.
--
-- RLS still applies to what is broadcast, so anon receives changes to live
-- rows and nothing else. A draft edited in the dashboard stays invisible.
-- ========================================================================

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No supabase_realtime publication — skipping. (Hosted Supabase always has one; self-hosted may not.)';
    return;
  end if;

  foreach t in array array[
    'news', 'workshops', 'projects', 'communities', 'collectives',
    'story_entries', 'constellation_points', 'stories',
    'pages', 'page_localizations'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I replica identity full', t);

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'realtime: added public.%', t;
    end if;
  end loop;
end $$;

-- ========================================================================
-- 8. Data API grants
--
-- RLS decides which *rows* a role may touch. It does not decide whether the
-- role may touch the table at all — that is a table privilege, and the two are
-- separate gates. A policy permitting everything grants nothing on a table the
-- role has no privilege on.
--
-- This file never said any of it, because it never had to: a Supabase project
-- used to auto-expose whatever `postgres` created in `public` to `anon`,
-- `authenticated` and `service_role`. That default is gone. A project created
-- now — including every local `supabase start` — revokes instead, and then
-- every read comes back
--
--   42501  permission denied for table news
--
-- with all twenty policies present and correct, which is a confusing way to
-- learn that a policy is not a privilege. See `auto_expose_new_tables` in
-- app/supabase/config.toml: the flag that restores the old behaviour is
-- deprecated and removed on 2026-10-30, so writing the grants down is the only
-- version of this that keeps working.
--
-- Each grant below is one verb some policy above already permits, and no more.
-- On a project that still auto-exposes, every line here is a no-op that
-- restates what is already true — which is what makes it safe to re-run and
-- safe to apply to the live project.
--
-- No sequence grants: every id here is either supplied text or a generated
-- uuid, so nothing uses a sequence a writer would need `usage` on.
-- ========================================================================

-- ---------- anon: the public site ----------

-- Content, read-only. One table per read policy in section 5e.
--
-- `authenticated` was for a while the one grant here with no policy behind it,
-- carried so that a signed-in reader would get the hosted project's answer —
-- 200 and no rows — rather than a 403 that existed locally and nowhere else.
-- Section 5e now admits that role, so the privilege and the policy agree and
-- the exception is gone: signing in at /review no longer costs you the site.
grant select on table
  public.news,
  public.workshops,
  public.projects,
  public.communities,
  public.collectives,
  public.constellation_points,
  public.story_entries,
  public.pages,
  public.page_localizations
to anon, authenticated;

-- The three intake tables: add a row. `authenticated` is here for the reason
-- the read grant gives — a signed-in visitor has to be able to send the form
-- too, and an insert policy admitting `anon` alone fails them at the database
-- with the form looking perfectly fine. Reading back is staff-only, and that
-- grant is further down.
grant insert on table
  public.submissions,
  public.stories,
  public.workshop_registrations
to anon, authenticated;

-- The one exception, and it is a policy not a privilege: `anon reads published`
-- narrows this to stories a reviewer has published. No page reads it yet.
grant select on table public.stories to anon;

-- ---------- authenticated: the review desk ----------

-- Read the queue and move a status. No delete, deliberately: a submission is
-- someone's account of something that happened to them, and declining it is a
-- status rather than an erasure — see the policies in section 2d.
grant select, update on table
  public.submissions,
  public.stories,
  public.workshop_registrations
to authenticated;

-- `is_staff()` consults this, and a staff member may see the list they are on.
grant select on table public.staff_emails to authenticated;

-- ---------- service_role: the bypass key ----------
--
-- No policies, because it carries `bypassrls` — but bypassing RLS is not the
-- same as holding the privilege, so without this it is refused too, which
-- contradicts the one thing every doc says about this key. Granted the full set
-- on the app's own tables and nothing else.

grant select, insert, update, delete on table
  public.news,
  public.workshops,
  public.projects,
  public.communities,
  public.collectives,
  public.constellation_points,
  public.story_entries,
  public.pages,
  public.page_localizations,
  public.submissions,
  public.stories,
  public.workshop_registrations,
  public.staff_emails
to service_role;
