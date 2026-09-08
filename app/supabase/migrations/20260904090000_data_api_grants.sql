-- Data API grants — section 8 of schema.sql, as a migration.
--
-- Every table here has had RLS and policies since it was created, and the site
-- read them happily, because a Supabase project used to auto-expose whatever
-- `postgres` created in `public` to `anon`, `authenticated` and `service_role`.
-- A project created now revokes instead. RLS governs rows; a table privilege
-- governs the table; the policies were only ever half of it.
--
-- What surfaced this was running the schema on an empty database for the first
-- time — `supabase start` locally — where every read is
--
--   42501  permission denied for table news
--
-- with all twenty policies present. `auto_expose_new_tables = true` in
-- config.toml would paper over it, and is removed on 2026-10-30, so the grants
-- are written down instead.
--
-- On the linked project, which still auto-exposes, this whole file is a no-op
-- restating privileges that are already there. That is what makes it safe to
-- push to a database with content in it.

-- ---------- anon: the public site ----------

-- Content, read-only. One table per `anon reads ...` select policy.
--
-- `authenticated` is here without a policy of its own, which is the one
-- exception to the rule above, and it is about not being stricter than the
-- database this stands in for: auto-exposure gave the privilege to all three
-- Data API roles, so on the hosted project a signed-in reader gets 200 and no
-- rows — the policies admit `anon` only. Withhold the privilege here and the
-- same reader gets 403 instead, a failure mode that exists locally and nowhere
-- else, which is the opposite of what a local copy is for.
--
-- That a signed-in staff member reads no live content is a real thing and is
-- not this block's to fix: it is the `to anon` on the nine read policies, and
-- widening those is a change to what the live site does.
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

-- The three intake tables: add a row, never read one back.
grant insert on table
  public.submissions,
  public.stories,
  public.workshop_registrations
to anon;

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
