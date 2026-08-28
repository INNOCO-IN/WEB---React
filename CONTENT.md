# Content map — what the database drives

Every piece of copy on the site is now in one of three places. This is the map
of which, and why.

| Where it lives | What it holds | Who edits it |
|---|---|---|
| **Supabase** | News, workshops, the IN-Collective roster, projects, communities, stories, constellation points | Anyone, in the Table Editor |
| **Bundled** (`app/src/lib/content/`) | A copy of all of the above | Nobody by hand — regenerated from `site/` |
| **The page component** | Everything else: headings, essays, manifesto, hero copy | A developer, in the `.tsx` |

The bundled copy is not a backup that goes stale. It is what renders on the
first paint and what renders if a query fails, so a card grid is never blank
and never shows a spinner. The database wins the moment it answers.

## Live updates

A page stays subscribed to the tables it reads, so an edit in the Table Editor
reaches an open tab in about a second — no reload, no deploy. Adding a workshop
adds its card *and* its audience filter chip; adding a person to the roster puts
them on `/collectives`; moving a news item's `status` to `live` makes it appear.

How it works, and the three things worth knowing about it:

- **One subscription per table, shared.** Two components on the Community page
  read `news`; both are served by one socket subscription, opened when the first
  reader mounts and closed a few seconds after the last one leaves.
- **A change triggers a refetch, not a patch.** The queries carry filters and an
  ordering (`status = 'live'`, newest first, `feeds` containing `community`), and
  a row that leaves a filter arrives as an update rather than a removal. These
  tables are tens of rows, so re-reading is both cheaper to reason about and
  impossible to get wrong.
- **A burst is one refetch.** Pasting a seed file fires an event per row; the
  page reads once, after the burst.

RLS still governs what is broadcast, so the anon key sees changes to live rows
and nothing else. A draft edited in the dashboard stays invisible until it is
published.

Two things have to be true in the database for this to work, and both are at the
end of [`schema.sql`](schema.sql): each table needs `replica identity full`, and
each has to be in the `supabase_realtime` publication. A table that is not in the
publication is *silent* rather than broken — no error, no events, and a page that
only updates on reload. In development the overlay in the bottom-left corner says
which tables are being watched, so that case is visible rather than mysterious.

## Which page reads which table

Every route has a **page model** — an entry in
[`app/src/lib/page-model.ts`](app/src/lib/page-model.ts) naming the tables that
page reads and writes. It is the one place the site's shape is stated rather than
inferred from an import.

The hooks are what actually read and subscribe: a component that needs news calls
`useNews`, which names `news` itself. The model is the second opinion — it
generates the map below, it records what is still hard-coded, and in development
the overlay flags a page whose model names a table the page never reads, which is
how a model goes quietly wrong.

Nothing is hard-coded any more: the model declared three `gaps` — the project
index, five project pages missing from the register, and the community
directory — and all three now read their table, so the *Not in the database
yet* section below is absent rather than empty. The mechanism stays for the next
one.

<!-- begin generated: scripts/content-map.mjs -->

Generated from [`app/src/lib/page-model.ts`](app/src/lib/page-model.ts) by
`node scripts/content-map.mjs`. Edit the model, re-run, commit both.

29 of 54 pages read or write a table; the rest carry their copy in the
component. Every table listed under **Reads** is watched while a page that reads it
is open, so an edit in the Table Editor arrives without a reload.

### Reads

| Page | Route | Table | What comes from it |
|---|---|---|---|
| **Home** | | | |
| Home | `/`, `/ko` | `news` (feed `home`) | the news tile in the card grid — the newest item on the home feed |
| **Start Within** | | | |
| Collectives | `/collectives`, `/ko/collectives` | `collectives` | the roster, each bio expanding in place |
| **Share the Space** | | | |
| Workshop | `/workshop`, `/ko/workshop` | `workshops` | the featured row, the card wall below it, and the audience filter chips |
| Story index | `/story/all`, `/ko/story/all` | `story_entries` | every story, its filters and its reading pane |
| **Serve the Whole** | | | |
| Project index | `/project`, `/ko/project` | `projects` | the wall of project briefs — every project but the one the page features |
| Project detail (×8) | `/project/asia-exchange`, `/project/food-revolution`, `/project/jungle-jam`, `/project/light-shadow-shift-womens-retreat`, `/project/shadow-shifter`, `/project/uae-youth-social-innovation`, `/project/unc-documentary`, `/project/unc` | `projects` | the All projects rail beside the article |
| Project detail | `/project/:slug` | `projects` | the title, and the All projects rail beside the article |
| Community | `/community`, `/ko/community` | `communities` | the circles grid |
| | | `news` (feed `community`) | the news grid below the circles |
| Community index | `/community/all` | `communities` | the directory — every circle, with the line that says where it stands |
| Constellation | `/constellation`, `/ko/constellation` | `constellation_points` | every light on the map, and both grouping modes |
| News | `/news`, `/ko/news` | `news` (feed `news`) | the whole card wall |

### Writes

| Page | Route | Table | What goes into it |
|---|---|---|---|
| **Share the Space** | | | |
| Story submission | `/story/submit` | `stories` | the submission, and its attachment in the story-media bucket |
| **Connect** | | | |
| Are you IN? | `/connect`, `/ko/connect` | `submissions` | the enquiry form |

Tables read by at least one page: `collectives`, `communities`, `constellation_points`, `news`, `projects`, `story_entries`, `workshops`.

<!-- end generated -->

## The tables

Full definitions in [`schema.sql`](schema.sql). The shape worth knowing:

**`news`** — one row per card. `feeds` is an array, so one item can appear on
Home, News and Community at once without being written three times. `kind` is
the vertical rail label (Upcoming, Milestone, Recap, Press…). `status` must be
`live` to appear.

**`workshops`** — the card wall. `audience` drives the filter chips: the chips
are derived from the audiences the rows actually carry, so adding a workshop
for a new audience adds its filter automatically. `featured` marks the
signature workshop, drawn full-bleed above the wall and excluded from it.

**`projects`** — the wall of briefs on the index page and the *All projects*
rail beside every article, from the same thirteen rows. `meta` is the short line
the rail shows under the title (`Sharjah · 2017`); `eyebrow` is the longer one
the card shows above it (`Zayed University, UAE · Since 2016`). `featured`
marks the one project the index gives its own block to, which is drawn by the
page and left out of the wall — the same division `workshops` uses.
`sort_order` is the order of both the wall and the rail.

**`communities`** — the nine circles on the Community page and the directory on
`/community/all`. `meta` says where a circle stands (`Online · Resuming soon`,
`On hold · Archive`), which is what the directory lists and what the eyebrow
cannot say, being `Community` on all nine. Two circles point at a project
rather than a community page: the community an intervention left behind is not
the intervention, and `route` is where that gets said.

**`collectives`** — the IN-Collective roster: the people who carry MEWE into
their own communities, one row each. Distinct from `communities`, which holds the
circles rather than the individuals. `num` is the primary key rather than a uuid
because the number *is* the identity — the page shows it, the roster is ordered
by it, and it is how a collective gets referred to (`#05`). Zero-padded, so a
plain text sort puts them in order. A row with no `photo` renders the blank plate
rather than a broken image.

**`story_entries`** — the curated story collection, both languages on one row
as `en` and `ko` JSON. `id` is the permalink (`/story/all?story=this-is-us`),
so it never changes.

**`constellation_points`** — a superset of the stories: each carries who it
came from and up to three ways to follow it (read / watch / view).

**`stories`** — what visitors submit. Separate from `story_entries` on purpose:
this is an inbox. Only rows moved to `status = 'published'` are readable at
all, and an editor promotes the good ones into `story_entries` with a slug.

### Three conventions

`accent` holds a **token name** — `magenta`, `tan`, `slate` — not a hex value.
The colour belongs to the design system, so changing the token restyles every
card using it. A raw `#RRGGBB` still works where a piece of content needs one.

`route` and `link` hold **app paths** (`/workshop/mobius-making`), so an editor
never has to know a component name. External URLs are fine in `link`.

A **`_ko` column** is the same field in Korean — `title_ko`, `body_ko`. The
Korean pages are not translations of a data source: they are the same layout
with Korean copy written into it, so a wall that becomes data has to carry both
or `/ko/project` starts rendering English. Empty means untranslated, and the
page falls back to English *field by field* — a row with a Korean title and no
Korean blurb shows the Korean title, rather than reverting the whole card. So a
wall can be translated one line at a time in the Table Editor.

## Setting it up

Nothing here is required for the site to run — it runs on the bundled copy. Do
this when you want the content to be editable without a deploy.

```bash
cd app && npm run supabase-setup
```

That writes `supabase-setup.sql` at the repo root — the schema and all four seeds
concatenated in dependency order, with a header saying how many rows it will
write to which tables. Paste the whole thing into Supabase → SQL Editor → Run,
then reload the site: the pages read live rows, and keep reading them as you
edit.

It is safe to re-run as often as you like, so it is both the first-time setup and
the way to push a content change made in `site/`. Every table is created
`if not exists`, every workshop column is added `if not exists` — that table
predates this work, from the intake form — and every insert is an upsert on the
primary key. The block at the end of the schema turns realtime on for each
content table and prints which ones it added.

The file is generated and gitignored: the five parts are the source of truth, so
committing the bundle would double every content diff. Run the parts by hand
instead if you prefer — [`schema.sql`](schema.sql) first, then
[`seed.sql`](seed.sql), [`seed-collectives.sql`](seed-collectives.sql),
[`seed-constellation.sql`](seed-constellation.sql) and
[`seed-stories.sql`](seed-stories.sql), in that order. The seeds fail on a table
that does not exist yet, and that failure reads like a broken seed rather than a
skipped schema, which is the mistake the one-file version exists to prevent.

Until you have run it, the console notes once per table that it is using the
bundled copy, and the development overlay says *no such table yet* rather than
*bundled copy* — they are different states, and the distinction is what you want
when you are trying to work out why an edit did not show up. Either way it is the
expected state, not an error.

## Regenerating the bundled copy

The extractors read `site/` and rewrite `app/src/lib/content/` **and** the seed
SQL in one pass, so the two can never disagree:

```bash
cd app && node scripts/extract-content.mjs && node scripts/extract-stories.mjs && node scripts/extract-page-data.mjs
```

They are also the audit. `extract-content.mjs` checks every image path in the
register against disk and reports what it cannot find — it caught
`Nepal_Storytelling.jpg`, which is really `community-img/nepal-storytelling.jpg`,
and had been a broken image on the live site.

The map above is generated separately, from the page models rather than from
`site/`:

```bash
cd app && node scripts/content-map.mjs           # rewrite the table
cd app && node scripts/content-map.mjs --check   # fail if it is stale
```

It is also the guard on the model. A route with no entry in `page-model.ts`, or
an entry for a route that no longer exists, fails the run — so adding a page
cannot quietly leave it off the map.

## What is deliberately not in the database

Long-form copy — the manifesto, the MEWE essay, workshop descriptions, project
articles. It is bespoke per page, it is laid out as much as it is written, and
putting it behind a text field would mean rebuilding the layout as a rich-text
renderer. It lives in the page components, where a developer edits it.
