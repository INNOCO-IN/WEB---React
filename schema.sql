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

-- ========== 3. Row Level Security: public can submit, not read ==========
alter table public.submissions enable row level security;
alter table public.stories     enable row level security;

drop policy if exists "anon can submit" on public.submissions;
create policy "anon can submit" on public.submissions
  for insert to anon with check (true);

drop policy if exists "anon can submit story" on public.stories;
create policy "anon can submit story" on public.stories
  for insert to anon with check (true);

-- Published stories are readable by the site (Story index / Constellation).
drop policy if exists "anon reads published" on public.stories;
create policy "anon reads published" on public.stories
  for select to anon using (status = 'published');

-- ========== 4. Storage bucket for attachments ==========
insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

drop policy if exists "anon uploads story media" on storage.objects;
create policy "anon uploads story media" on storage.objects
  for insert to anon with check (bucket_id = 'story-media');

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

-- ---------- 5e. Read policies ----------
-- Anon may read live rows and nothing else. There is no anon insert or update
-- on any of these: editorial content is changed in the Supabase dashboard, so
-- a leaked anon key can never rewrite the site's copy.
alter table public.news        enable row level security;
alter table public.workshops   enable row level security;
alter table public.projects    enable row level security;
alter table public.communities enable row level security;

drop policy if exists "anon reads live news" on public.news;
create policy "anon reads live news" on public.news
  for select to anon using (status = 'live');

drop policy if exists "anon reads active workshops" on public.workshops;
create policy "anon reads active workshops" on public.workshops
  for select to anon using (active = true);

drop policy if exists "anon reads live projects" on public.projects;
create policy "anon reads live projects" on public.projects
  for select to anon using (status = 'live');

drop policy if exists "anon reads live communities" on public.communities;
create policy "anon reads live communities" on public.communities
  for select to anon using (status = 'live');

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
  for select to anon using (true);

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

alter table public.constellation_points enable row level security;

drop policy if exists "anon reads constellation" on public.constellation_points;
create policy "anon reads constellation" on public.constellation_points
  for select to anon using (true);

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

alter table public.collectives enable row level security;

drop policy if exists "anon reads live collectives" on public.collectives;
create policy "anon reads live collectives" on public.collectives
  for select to anon using (status = 'live');

-- ========================================================================
-- 6. Realtime
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
    'story_entries', 'constellation_points', 'stories'
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
