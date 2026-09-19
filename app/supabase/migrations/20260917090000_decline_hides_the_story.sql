-- Declining a published story takes it off the site without erasing it.
--
-- 20260914090000 granted staff insert and update on the two published tables
-- and stopped there, on the reasoning that "taking a story back off the site is
-- a decision the desk deliberately does not draw". The first half turned out to
-- be wrong, and a test found it: `declined` is a button on every story row, and
-- what it did not do was carry the decision through. `setStatus` wrote one
-- column, so a declined story went on being the newest thing on `/story/all`
-- and went on burning as a light on the Constellation. Three surfaces, three
-- answers, and only the two the public could see were telling the truth.
--
-- The second half stands, and this is why the fix is a column rather than the
-- delete policy that fix first wanted. An entry is not only what the submitter
-- sent — it carries a headline, a permalink, a topic and a summary somebody
-- wrote, and a point carries an arc somebody placed. Deleting the row to undo a
-- publication throws all of that away to express a change of mind, and a change
-- of mind is a thing people have twice. So: the row stays, and stops being
-- served.
--
-- `hidden` rather than reusing `draft`. They are different facts and the index
-- already draws them differently: a draft is published and marked as unfinished
-- — it appears in the list with a badge — whereas hidden is not published at
-- all. `constellation_points` has neither, and gets only this one.

alter table public.story_entries
  add column if not exists hidden boolean not null default false;

comment on column public.story_entries.hidden is
  'Taken off the site without being erased — what declining a published story does. Not `draft`: a draft is published and badged, this is not served at all.';

alter table public.constellation_points
  add column if not exists hidden boolean not null default false;

comment on column public.constellation_points.hidden is
  'Taken off the map without being erased. See story_entries.hidden.';

-- ---------- who may still read it ----------
--
-- The readers filter on this too, but the rule belongs here as well: a hidden
-- entry is content nobody decided to publish, and "the query remembered to ask"
-- is not the right guarantee for that. Staff keep seeing everything, because
-- the desk has to be able to say what it can put back.
--
-- Two permissive select policies on one table are OR'd, which is what makes
-- this pair work: the public one narrows, the staff one restores.

drop policy if exists "anon reads story entries" on public.story_entries;
create policy "anon reads story entries" on public.story_entries
  for select to anon, authenticated using (not hidden);

drop policy if exists "staff read hidden story entries" on public.story_entries;
create policy "staff read hidden story entries" on public.story_entries
  for select to authenticated using (public.is_staff());

drop policy if exists "anon reads constellation" on public.constellation_points;
create policy "anon reads constellation" on public.constellation_points
  for select to anon, authenticated using (not hidden);

drop policy if exists "staff read hidden constellation points" on public.constellation_points;
create policy "staff read hidden constellation points" on public.constellation_points
  for select to authenticated using (public.is_staff());

-- No new grant: hiding and restoring are updates, and `update` on both tables
-- was granted in 20260914090000. Nothing here needs `delete`, which is the
-- point.
