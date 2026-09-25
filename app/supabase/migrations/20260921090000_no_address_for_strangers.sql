-- Keep a storyteller's email out of reach, even after their story is published.
--
-- `anon reads published` on public.stories is a row policy: it lets the anon key
-- read a row once status = 'published'. A policy cannot narrow which *columns*
-- come back, so the same key that renders the story cards can also ask for
-- `select=email` and get the address the person left when they submitted it.
--
-- Nothing is leaking today, and that is the whole problem: of 38 rows, the 7
-- that carry an email are all still `pending`, and the 31 that are published
-- have email null. So the protection is an accident of which rows happen to be
-- published, not a rule. The first time a reviewer publishes a real submission
-- -- which is the ordinary, intended use of the desk -- that person's address
-- becomes readable by anyone with the key that ships in the browser bundle.
-- Nothing in the desk says so at the moment of pressing publish.
--
-- Column privileges are the part of Postgres that can say this, so the grant is
-- rewritten as a white list of what the public pages actually read.
-- fetchPublishedStories in app/src/lib/services/content.ts selects exactly eight
-- columns and filters on a ninth; those nine are granted and nothing else is.
-- A column added later is private until someone says otherwise, which is the
-- right default for a table that holds what visitors sent us.
--
-- Deliberately unchanged:
--   * INSERT. The form still writes email, consent and source_page -- `anon can
--     submit story` is untouched, and a visitor who leaves an address still
--     reaches the desk with it.
--   * `authenticated`. Staff read the whole row, because answering a submission
--     is what the address is for, and `staff read stories` already gates that
--     behind is_staff().
--   * The row policy itself. Which rows are public is a separate question from
--     which columns are, and the row rule is right.

revoke select on public.stories from anon;

grant select (
  id,
  created_at,
  door,
  body,
  format,
  arc_stage,
  credit_name,
  attachment_url,
  status
) on public.stories to anon;
