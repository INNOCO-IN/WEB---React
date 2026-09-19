-- The news queue on the review desk — reading every row, and editing one.
--
-- 20260914090000 drew the line where it did on purpose: staff may write
-- `story_entries` and `constellation_points`, and "`news`, `workshops`,
-- `projects` and the rest stay service-role-write, because no screen asks a
-- reviewer to edit them." That sentence is the condition, not the rule, and it
-- has now changed: the desk grows a fourth queue whose rows are news items, and
-- it asks for both halves of an edit — the status, and the words.
--
-- Three things this has to answer that the intake tables never did.

-- ---------- 1. the desk cannot currently see the queue at all ----------
--
-- Every intake table is invisible to anon and readable by staff, so the desk
-- reads them and a stranger reads nothing. `news` is the opposite shape: it is
-- public, and the policy narrows it to `status = 'live'` for anon *and* for
-- authenticated (20260912103000). A signed-in reviewer therefore sees exactly
-- what a visitor sees — which means a desk built on that policy would show a
-- queue with no drafts and no archive in it, and would show it without
-- complaint. The two states a reviewer most needs are the two the site hides.
--
-- So staff get their own read, added beside the public one rather than widening
-- it. Postgres ORs permissive policies together: a visitor keeps `live`, a
-- reviewer gets everything, and the public rule stays legible as the public
-- rule instead of growing an `or is_staff()` tail that every future reader has
-- to decode.
drop policy if exists "staff read every news row" on public.news;
create policy "staff read every news row" on public.news
  for select to authenticated using (public.is_staff());

-- ---------- 2. the edit itself ----------
--
-- Update only, and bounded the same way 20260914090000 bounded its two tables:
--
--   * `is_staff()`, not merely `authenticated` — every signed-in reader of the
--     site carries that role.
--   * No delete. Taking an item off the site is `status`, which is a move the
--     desk can draw and reverse; a delete is neither.
--   * No insert. A news row's `id` is its key in the content register
--     (`COMM/NEWS/4`), and that register lives in `site/data`. A row created
--     here would have an id nothing generated and nothing would reconcile it.
--     Writing a *new* item is still an edit to `site/`; this is for the items
--     that are already here.
drop policy if exists "staff edit news" on public.news;
create policy "staff edit news" on public.news
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- The privilege as well as the policy — the lesson of 20260904090000, where a
-- policy on a table the role could not write read as a permissions bug.
grant update on table public.news to authenticated;

-- ---------- 3. what the seed does next time ----------
--
-- This is the half that fails silently, and it is the reason this migration
-- carries two columns rather than only policies.
--
-- `news` is seeded from `site/`, and the generated upsert in `seed.sql` ends:
--
--     on conflict (id) do update set
--       ... title = excluded.title, body = excluded.body,
--       title_ko = coalesce(news.title_ko, excluded.title_ko),
--       ... status = excluded.status;
--
-- The Korean columns are protected because Supabase is their authority. The
-- English columns and `status` are not — they are overwritten on every run,
-- because `site/` has been their authority and there was nowhere else they
-- could have been written. A desk that edits them changes that, and the next
-- `npm run extract-content` would revert the edit with no error, no conflict
-- and nothing in the page to show it had happened. The row would simply go back
-- to saying what the register says.
--
-- Widening the `coalesce` to every column is the obvious fix and the wrong one:
-- it would mean `site/` could never correct a typo in a news item again, for
-- every row, whether or not anybody had ever opened it in the desk.
--
-- So the row records the fact instead. `edited_at` is null for every row the
-- desk has never written, which is all of them today, and the generator reads
-- it: an untouched row still follows `site/`, and a touched one keeps what the
-- reviewer typed. The authority moves one row at a time, at the moment somebody
-- takes it, and the fact is visible rather than inferred — the desk can say
-- "edited here, the register no longer overwrites this row" because the column
-- is what makes it true.
alter table public.news add column if not exists edited_at timestamptz;
alter table public.news add column if not exists edited_by text;

comment on column public.news.edited_at is
  'When the review desk last wrote this row, or null if it never has. Read by the seed generator in app/scripts/extract-content.mjs: a row with a value here is no longer overwritten from site/, so an edit made in the desk survives the next extract. Null is the normal state.';

comment on column public.news.edited_by is
  'The staff address that last wrote this row from the desk. Recorded beside edited_at so an unexpected divergence from site/ has a name on it; not a foreign key, because the allowlist may change without that erasing who made the edit.';

-- Reading the queue means ordering by what happened last, across both the
-- register's own date and the desk's.
create index if not exists news_edited_idx on public.news (edited_at desc nulls last);
