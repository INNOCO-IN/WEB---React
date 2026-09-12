-- Signing in must not take the site away — sections 3, 4 and 5e of schema.sql.
--
-- Every public policy named `anon` and only `anon`. That is correct for a
-- visitor and wrong for everyone else: a reviewer who signs in at /review is
-- still a reader of the public pages, and their requests carry the role
-- `authenticated`, which no select policy admitted. PostgREST answers 200 with
-- an empty array — the privilege was granted, so it is not a 403 — and the app
-- cannot tell that apart from a table nobody has filled in yet. So it does the
-- thing it is built to do and renders the bundled copy, on every page, with no
-- error and nothing in the console, until that person signs out.
--
-- It cost an afternoon to find, and the overlay is what found it: `story_entries
-- — bundled copy · watching`. Subscribed to a table it was reading nothing from.
--
-- The three insert policies have the same shape and the same silence: a signed-in
-- visitor's story submission is refused by the database while the form looks
-- perfectly fine. They are widened here too, with the privilege to match.
--
-- Nothing here widens what is *visible*. Every row these policies return is a row
-- the anon key already returns to anyone who loads the site; `authenticated` is
-- the same reader with a session attached. Writes stay where they were: no update
-- or delete for either role, and reading the intake tables back is still
-- staff-only, gated by `is_staff()` in 20260903090000_staff_review_access.sql.

-- ---------- the intake forms: anyone may send one ----------

drop policy if exists "anon can submit" on public.submissions;
create policy "anon can submit" on public.submissions
  for insert to anon, authenticated with check (true);

drop policy if exists "anon can submit story" on public.stories;
create policy "anon can submit story" on public.stories
  for insert to anon, authenticated with check (true);

drop policy if exists "anon can register" on public.workshop_registrations;
create policy "anon can register" on public.workshop_registrations
  for insert to anon, authenticated with check (true);

drop policy if exists "anon reads published" on public.stories;
create policy "anon reads published" on public.stories
  for select to anon, authenticated using (status = 'published');

-- The attachment goes with the story, so it needs the same widening or a
-- signed-in submitter gets half a submission.
drop policy if exists "anon uploads story media" on storage.objects;
create policy "anon uploads story media" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'story-media');

-- ---------- editorial content: the nine read policies ----------

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

drop policy if exists "anon reads live collectives" on public.collectives;
create policy "anon reads live collectives" on public.collectives
  for select to anon, authenticated using (status = 'live');

drop policy if exists "anon reads story entries" on public.story_entries;
create policy "anon reads story entries" on public.story_entries
  for select to anon, authenticated using (true);

drop policy if exists "anon reads constellation" on public.constellation_points;
create policy "anon reads constellation" on public.constellation_points
  for select to anon, authenticated using (true);

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

-- ---------- the privilege behind the three insert policies ----------
--
-- The content read grant already named `authenticated` — it was carried without
-- a policy behind it so that a signed-in reader would get the hosted project's
-- 200-and-no-rows rather than a 403 seen nowhere but a local stack. That
-- exception is retired: the policy above now admits the role the grant already
-- did. The insert grant did not have it, so it is added here.
grant insert on table
  public.submissions,
  public.stories,
  public.workshop_registrations
to authenticated;
