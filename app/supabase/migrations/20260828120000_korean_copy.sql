-- Korean copy for the four content tables that had none.
--
-- projects, communities and story_entries already carried their Korean text.
-- news, workshops, collectives and constellation_points did not — so the four
-- Korean pages built on them (/ko/news, /ko/workshop, /ko/collectives,
-- /ko/constellation) drew Korean headings around English rows, with no way for
-- an editor to fix it short of editing a page component.
--
-- Every column is nullable and nothing is backfilled. The site falls back to
-- English field by field (`inLang` in app/src/lib/content/types.ts), so a row
-- translated halfway shows the half that exists rather than reverting whole.

-- ---------- news ----------
alter table public.news add column if not exists kind_ko    text;
alter table public.news add column if not exists eyebrow_ko text;
alter table public.news add column if not exists title_ko   text;
alter table public.news add column if not exists body_ko    text;

-- ---------- workshops ----------
-- `audience` stays the grouping key in both languages — the filter matches on
-- it — and `audience_ko` is only what the chip is labelled. Translating the
-- key itself would split one audience into two the moment a second row was
-- translated.
alter table public.workshops add column if not exists title_ko    text;
alter table public.workshops add column if not exists eyebrow_ko  text;
alter table public.workshops add column if not exists blurb_ko    text;
alter table public.workshops add column if not exists audience_ko text;
alter table public.workshops add column if not exists duration_ko text;
alter table public.workshops add column if not exists cta_ko      text;

-- ---------- collectives ----------
alter table public.collectives add column if not exists name_ko      text;
alter table public.collectives add column if not exists one_liner_ko text;
alter table public.collectives add column if not exists full_bio_ko  text;
alter table public.collectives add column if not exists role_ko      text;

-- ---------- constellation_points ----------
-- `topic` is a grouping key here for the same reason `audience` is above, so
-- `topic_ko` labels the cluster and does not define it. `format` is a fixed
-- vocabulary keyed to the colour scale, translated in the app rather than here.
alter table public.constellation_points add column if not exists title_ko   text;
alter table public.constellation_points add column if not exists by_line_ko text;
alter table public.constellation_points add column if not exists caption_ko text;
alter table public.constellation_points add column if not exists topic_ko   text;
