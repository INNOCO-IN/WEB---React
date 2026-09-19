-- Publishing, from the desk rather than from a terminal — the review desk's
-- screens 6 and 7.
--
-- `stories` and `story_entries` are two tables on purpose: the first is what a
-- visitor sent, the second is what the index publishes, and the gap between
-- them is editorial — a permalink, a headline, a topic and a summary the form
-- never asked for. Nothing here closes that gap. A person still writes those
-- four things; this only changes *where* they type them.
--
-- Until now the answer was `scripts/promote-story.mjs`, which prints SQL for
-- somebody to paste, because the browser could not write these tables at all:
-- sections 5f and 5g grant `select` to anon and authenticated and stop there,
-- so the only writer was `service_role`. That made publishing a two-tool job —
-- decide in the desk, carry it across in a shell — and the two halves could
-- disagree. A reviewer could mark a story `published` and never run the script,
-- which is precisely the state the desk now has to be able to name out loud
-- ("Published" is not "on the site") *and* be able to resolve.
--
-- So: staff may write the two published tables. Three things bound it.
--
--   * `is_staff()`, the same function guarding the intake tables in
--     20260903090000 — not merely `authenticated`. A signed-in visitor is a
--     reader of the site, and every reader carries that role.
--   * Insert and update only. No delete, matching the intake tables: taking a
--     story back off the site is a decision the desk deliberately does not
--     draw, and it would not be a delete if it did.
--   * These two tables only. `news`, `workshops`, `projects` and the rest stay
--     service-role-write, because no screen asks a reviewer to edit them.
--
-- The privilege has to be granted as well as the policy allowed. A policy on a
-- table the role cannot write is a 403 that reads like a permissions bug,
-- which is the lesson of 20260904090000.

-- ---------- the index entry ----------

drop policy if exists "staff publish story entries" on public.story_entries;
create policy "staff publish story entries" on public.story_entries
  for insert to authenticated with check (public.is_staff());

-- Update, so the second and later presses on the same permalink are an edit
-- rather than a duplicate-key error. The desk upserts on `id`, and `id` is the
-- permalink: publishing the same story twice is the reviewer correcting a
-- headline, not creating a second story.
drop policy if exists "staff edit story entries" on public.story_entries;
create policy "staff edit story entries" on public.story_entries
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- the point on the map ----------
-- The Constellation is a third place, not a view of the index: a story can be
-- published and deliberately left off it, and the map carries points that were
-- never submissions. The desk asks that as its own yes/no, so the grant is its
-- own too.

drop policy if exists "staff place constellation points" on public.constellation_points;
create policy "staff place constellation points" on public.constellation_points
  for insert to authenticated with check (public.is_staff());

drop policy if exists "staff edit constellation points" on public.constellation_points;
create policy "staff edit constellation points" on public.constellation_points
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- the privilege behind the policies ----------

grant insert, update on table
  public.story_entries,
  public.constellation_points
to authenticated;

-- ---------- which entry a submission became ----------
--
-- "Published" and "on the site" are two different facts, and the desk's rule is
-- that they must stay distinguishable: a story can be marked published and not
-- yet be readable anywhere. Stating the second one requires knowing which
-- `story_entries` row this submission turned into — and nothing recorded that.
--
-- The two tables share no key and cannot: `stories.id` is a uuid the form
-- generated, `story_entries.id` is a permalink a reviewer wrote, and the
-- permalink does not exist until the moment of publishing. Matching them back
-- up by title or by date would be a guess, and a guess is exactly what this
-- pair of facts must not be built on.
--
-- So the press records it. Null means no entry was ever written for this
-- submission, which is the true state of every row in the table today and of
-- every story that is declined or still pending.
alter table public.stories add column if not exists published_as text;

comment on column public.stories.published_as is
  'The story_entries permalink this submission was published as, or null. Written by the review desk at publish; not a foreign key, because an entry may be renamed or removed on the site without that erasing what was decided here.';
