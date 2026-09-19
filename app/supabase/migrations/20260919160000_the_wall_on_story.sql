-- The wall of cards at the foot of /story — editable from the desk, and chosen
-- there rather than only dated into place.
--
-- Since the 2026 design merge that wall reads `story_entries` instead of the
-- twelve `<article>` blocks that used to be written out in
-- `site/Story.EN.dc.html`, and what it shows is "the twelve most recent, by
-- `published_on`". That sentence was also the whole of the editorial control
-- anybody had over it. The desk can publish a submission into an entry
-- (20260914090000) and can take one back off the site (20260917090000), but it
-- could not change a word of an entry already there — and most of the wall is
-- not there by way of a submission at all. Those rows came from
-- `seed-stories.sql`, which is generated from `site/data/stories.js`, so a typo
-- on a card was a three-step job in a terminal and a card in the wrong place
-- could only be moved by lying about the day it was published.
--
-- The policies are not repeated here. 20260914090000 already grants staff
-- insert and update on this table, bounded by `is_staff()` and with no delete,
-- and 20260917090000 already gives staff the read that returns hidden rows. All
-- that was missing is two facts the table had nowhere to put.

-- ---------- 1. which ones are on the wall, and in what order ----------
--
-- One nullable integer, and it answers both questions:
--
--   * null — the date decides, which is what every row says today and what the
--     wall has always done.
--   * a number — this entry is on the wall, ahead of anything the date chose.
--     The number is a rank rather than a slot: it orders the pinned ones among
--     themselves, and the slots left over are filled by date as before.
--
-- Twelve pins therefore *are* the answer to "which twelve", because twelve
-- pinned rows leave no slot for the date to fill. That is why there is no
-- second column saying on-the-wall / off-the-wall: two columns would be two
-- answers to one question, and the day they disagreed about a row — pinned and
-- excluded — nothing here could say which of them the page should believe.
--
-- Deliberately not unique. Two rows carrying 3 is a tie, broken by date, and it
-- renders; a unique constraint would make swapping two cards a dance that can
-- fail in the middle and leave the wall in a state nobody asked for.
alter table public.story_entries add column if not exists wall_order integer;

comment on column public.story_entries.wall_order is
  'Where this entry sits on the wall at the foot of /story, or null to let published_on decide. Ascending; pinned rows come first and the rest of the twelve are filled by date. Not unique — a tie is broken by date. Written by the review desk; no seed touches it.';

create index if not exists story_entries_wall_idx
  on public.story_entries (wall_order asc nulls last, published_on desc);

-- ---------- 2. the row the desk has taken over ----------
--
-- This is the half that fails silently, and it is the same one
-- 20260919104500 found under the news queue.
--
-- `seed-stories.sql` is generated from `site/data/stories.js` and its upsert
-- ends `on conflict (id) do update set ... en = excluded.en, ko = excluded.ko`.
-- Every column it lists is overwritten on every run, because `site/` has been
-- their authority and there was nowhere else they could have been written. A
-- desk that edits them changes that, and the next `npm run extract-stories`
-- would revert the edit with no error, no conflict, and the card still
-- rendering — simply saying what the file says again.
--
-- Widening the guard to the whole table is the obvious fix and the wrong one:
-- it would mean `site/` could never correct any of these rows again, whether or
-- not anybody had ever opened one in the desk.
--
-- So the row records the fact. `edited_at` is null for every row the desk has
-- never written, which is all of them today, and the generator reads it: an
-- untouched row still follows `site/`, a touched one keeps what the reviewer
-- typed. Authority moves one row at a time, at the moment somebody takes it.
--
-- `hidden` and `wall_order` need no such guard and get no stamp: neither is in
-- the seed's column list at all, so no run of the extractor can undo a hide or
-- a pin. Stamping them anyway would quietly freeze a row's words against
-- `site/` as the side effect of a decision about where it sits, which is
-- exactly the kind of thing this column exists to make visible rather than to
-- cause.
alter table public.story_entries add column if not exists edited_at timestamptz;
alter table public.story_entries add column if not exists edited_by text;

comment on column public.story_entries.edited_at is
  'When the review desk last wrote this entry''s content, or null if it never has. Read by the seed generator in app/scripts/extract-stories.mjs: a row with a value here is no longer overwritten from site/data/stories.js, so an edit made in the desk survives the next extract. Null is the normal state. Hiding or pinning does not set it — those columns are not in the seed.';

comment on column public.story_entries.edited_by is
  'The staff address that last wrote this entry from the desk. Recorded beside edited_at so an unexpected divergence from site/ has a name on it; not a foreign key, because the allowlist may change without that erasing who made the edit.';
