# IN Website

```
site/     the static site — still what Vercel serves
app/      the React app — a complete port of site/, not deployed yet
schema.sql, seed*.sql, *.md, vercel.json   at the root
```

Both trees render the same website. `site/` is live; `app/` is the replacement,
finished and verified locally but **not yet switched on** — see [Deploy](#deploy).

## `app/` — the React site

```bash
cd app && npm install && npm run dev     # http://localhost:5174
```

Vite + React 19 + TypeScript + React Router + i18next. Scripts: `dev`, `build`
(typecheck + build), `preview`, `lint`, `typecheck`, `test`.

`dev` runs against a **Supabase on this machine** (`vite --mode devdb`), so it
wants Docker up and `npm run db:start`. `dev:live` is the one that reaches the
hosted project. Neither is required to see the site: with no database at all
every page renders from its bundled copy — see [Content from the
database](#content-from-the-database).

All 71 routes, both languages, with real URLs:

```
/                     /workshop            /workshop/mobius-making
/manifesto            /story               /story/all  /story/submit
/mewe                 /project             /project/food-revolution
/collectives          /community           /community/bridge-builders
/constellation        /news                /connect
/ko/…                 every EN route has a Korean twin where one exists
```

Three languages — `en`, `zh-TW`, `ko` — with the locale in the path. Interface
strings live in [`app/src/i18n/resources/`](app/src/i18n/resources) and are
served by i18next; the locale itself is derived from the URL in
[`app/src/lib/lang.ts`](app/src/lib/lang.ts), never from a header or a cookie.
See [Korean](ROUTES.md#korean) for the fallback rules.

### `app/src/builder/` — the page builder

A page is one shared element tree plus one record of words per language, so a
page's structure, colour and spacing are decided once and only the text is
written three times. A language that needs a different design can take its own
copy of the tree.

```bash
node scripts/migrate-builder-page.mjs        # spec → src/builder/pages/*.json
```

Element types are keys into an explicit registry
([`app/src/builder/registry.ts`](app/src/builder/registry.ts)), which also
declares, per field, whether a value is shared across languages or written per
language. Saved page data can never name a component or a path.

One page is migrated so far — News — and it is served by the builder only at
`/zh-tw/news`, because the converted components still hold `/news` and
`/ko/news`. `BUILDER_SERVES` in
[`app/src/builder/routes.ts`](app/src/builder/routes.ts) is the switch.

Every old `*.dc.html` URL redirects to its new route, so no inbound link
breaks — `/Are-you-IN.EN.dc.html` (the most-linked page on the site, 51 inbound)
lands on `/connect`. The table is generated, not hand-written: see
[`app/src/lib/route-map.ts`](app/src/lib/route-map.ts).

### How the port was made

The pages were converted from `site/`, not rewritten, so the design is
byte-for-byte the same. Three generators do it, and they are re-runnable —
edit a legacy page, re-run, and the React page follows:

```bash
cd app
node scripts/convert-pages.mjs        # 51 pages → src/pages/*.tsx + registry + route map
node scripts/extract-detail-pages.mjs # project + community briefs → the copy behind two templates
node scripts/extract-workshop-pages.mjs # four workshops, both languages → the copy behind a third
node scripts/extract-content.mjs      # cards → src/lib/content/*.ts + ../seed.sql
node scripts/extract-stories.mjs      # stories + constellation → content + seed SQL
node scripts/extract-page-data.mjs    # project galleries, roster → content + seed SQL
node scripts/content-map.mjs          # page models → the content map in CONTENT.md
node scripts/supabase-setup.mjs       # schema + every seed → one paste-ready file
```

The converter emits 51 pages rather than 71 because twenty of them were the
same page with different words. Those are three hand-written templates on
`:slug` routes, and the two `extract-*-pages` scripts read their copy out of
`site/` — so the legacy page is still the thing you edit. See
[Templates](ROUTES.md#templates).

What the converter turns into real React, rather than carrying over:

| Legacy | Becomes |
|---|---|
| `style="…"` string | a React style object, built at compile time |
| `style-hover="…"` attribute | `.in-card:hover` in a stylesheet |
| `{{ binding }}` + `DCLogic` class | a typed hook in `src/logic/` |
| `<sc-if>` / `<sc-for>` | `{cond && …}` and `.map()` |
| `<dc-import name="Nav">` | `<SiteLayout>` renders it |
| `<form data-in-form="stories">` | `<SupabaseForm table="stories">` |
| `<div data-chip-group>` | `<ChipGroup>` with real `<button>`s |
| `<a href="Workshop.EN.dc.html">` | `<Link to="/workshop">` |
| `[style*="width: 700px"]` media queries | class-based media queries |

Hand-written, not generated: the layout (`src/components/`), the data layer
(`src/lib/`), the page logic hooks (`src/logic/`), the card components that
replaced the hard-coded card walls (`src/components/cards/`), and the page
models (`src/lib/page-model.ts`).

### Content from the database

News, workshops, the IN-Collective roster, projects, communities, stories and the
constellation read from Supabase, with a bundled copy that renders instantly and
covers any failure. Each page also **stays subscribed** to the tables it reads,
so an edit in the Table Editor lands in an open tab without a reload.

The Supabase CLI is a `devDependency` of `app/`, so `npm run db:types`
regenerates `src/lib/database.types.ts` from the linked project and `npm run
db:link` is what points a checkout at one — see [`SUPABASE.md`](SUPABASE.md).

Every route has a **page model** — one entry in
[`src/lib/page-model.ts`](app/src/lib/page-model.ts) naming the tables that page
reads and writes. It decides what a page subscribes to, it generates the map in
CONTENT.md, and its `gaps` field records content that belongs in a table and is
still hard-coded. No entry declares one now: the last three — the project
index, the project register, and the community directory — read their table,
so every card wall on the site is a query.

**[`CONTENT.md`](CONTENT.md) is the map** — which page reads which table, what the
columns mean, how live updates work, and how to set it up.

The site runs fine with no database at all. Until you run `schema.sql`, it uses
the bundled copy and says so once in the console. In development a small overlay
in the bottom-left corner names the current page's tables and says, per table,
whether it is on the database or the bundled copy and whether it is being watched.

## `site/` — the static site

79 pages rendered in the browser by `support.js`, a client-side runtime that
pulls React and Babel from unpkg and interprets an `<x-dc>` tree. Nothing
renders with JavaScript off.

It stays for now as the live site and as the imagery source: 28 MB of photos
are served from `site/` by a Vite plugin rather than copied into `app/public/`,
so there is one copy of each file.

## Deploy

**Unchanged.** `vercel.json` still rewrites every request into `site/`, and
`.vercelignore` still excludes `app/`. Deploying today ships exactly what is
live now.

To switch to the React app, in one commit:

1. Remove `app` from `.vercelignore`.
2. Build command `cd app && npm install && npm run build`, output `app/dist`.
3. Replace the `rewrites` in `vercel.json` with a single SPA rule:
   `{ "source": "/(.*)", "destination": "/index.html" }` — React Router needs
   every path to serve the shell, or a refresh on `/workshop` 404s.

The build already copies `site/`'s imagery into `app/dist/`, so assets resolve.

### Two things the switch needs that this repo cannot show you

Both were read off the Vercel account on 2026-09-21. Neither is visible in any
file here, and the three steps above are not enough without them.

**The Vercel project deploys a different repository.** `web` — the project that
holds `innoco.co` and `www.innoco.co` — is connected to `INNOCO-IN/WEB`, branch
`main`, and its live production build is commit `093fcab`. That is the
predecessor repo, not this one. So the three steps can be made and committed
here and nothing will happen, because Vercel never reads this repository.
Either repoint that project at `INNOCO-IN/WEB---React`, or stand up a second
project for this repo and move the two domains once it looks right. The second
way is reversible until the domains move; the first is not.

**Vercel has no `VITE_` variables.** The project carries seventeen environment
variables and every one of them was planted by the Supabase integration, spelled
for Next.js: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POSTGRES_*`. Vite
only puts a `VITE_`-prefixed variable into the bundle, so deploying today builds
a site with no database at all — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
are `undefined`, the client is tree-shaken out, every page falls back to the copy
bundled in `src/lib/content/`, and both forms and `/review` quietly stop working.
Nothing errors and nothing looks broken; the pages just stop being live. Add the
two from `app/.env.local` to the project that will do the building, for the
production target, before the first deploy rather than after.

The build itself is ready. `npm --prefix app run build` is green, and the output
was exercised with `npm --prefix app run preview` on 2026-09-21: the production
bundle reaches the hosted project (`collectives` answers with all eighteen),
`/Workshop.EN.dc.html` redirects to `/workshop`, `/zh-tw/` renders Chinese, the
footer's `mailto` is `hi@innoco.co`, and no resource 404s.

## Known state

Two problems in `site/` that the conversion surfaced. Both are in the source,
not the port, and both need a decision rather than a fix:

- **`site/Manifesto.EN.dc.html` and `.KO` have unresolved merge conflicts** —
  14 and 6 hunks of `<<<<<<< HEAD` still in the file. The live pages render
  both versions of several blocks. The two sides differ only in accent colour
  (teal vs magenta) and colour-band height (56px vs 112px), so it is a design
  choice. The converter takes the HEAD side and reports it on every run.
- **`site/Workshop-Bucket-List.KO.dc.html` has a stray `<`** — a `</div>` that
  lost most of itself, which renders as a literal `<` on the live page. Kept
  as-is so the port matches; the converter reports it.

Carried over from before, unchanged:

- No KO version of `Community-*`, `Project-*` detail pages, `Story-Submission`
  or `Action-Research`; the KO nav links to the EN pages.
- Colour drift across pages: magenta as both `#E5188C` and `#E6328C`, teal as
  `#1E8A86` and `#146560`.
- `site/ME=WE.EN.dc.html` is superseded by `MEWE.EN.dc.html`; in the app that
  URL redirects to `/mewe`.

Fixed on the way through: the six orphan routes are now reachable, because the
project rail, the project index and the community grid read from the database
rather than from a hard-coded list of eight — the register holds all thirteen
projects, and the community grid all nine circles, two of which point at the
project that created them; the IN-Collective roster is a table rather than sixteen
literals in a page script; the `{{ person.photo }}` 404 on Collectives is gone;
the nested `<a>` in the news cards' photo credit is gone; and the Nepal
storytelling photo, referenced at a path that does not exist, now resolves.

## Forms

Both write to Supabase and are verified end-to-end — see [`SUPABASE.md`](SUPABASE.md).
`/connect` inserts into `submissions`; `/story/submit` inserts into `stories`
and uploads to the `story-media` bucket. A third, the workshop sign-up, is
`app/`-only for now.

A form's `<select>` sends a slug, never the sentence the reader saw, so the same
answer arrives as the same string in all three languages. Conditional blocks and
prefilling links are declared on the markup, as `field=value`. Both are in
[`SUPABASE.md`](SUPABASE.md#what-a-value-may-be).

## The review desk

`/review` shows what visitors sent — submissions, stories, workshop sign-ups —
in three queues, each grouped into waiting and handled, each with a search and
the filters that read off the fields its form already collects. A reviewer moves
a row's status, replies by handing over to their mail client, and publishes a
story to the site.

It is deliberately not a page of the site: no nav, no footer, no locale, no
entry in the route table, `noindex`, and nothing links to it. Sign-in is a
mailed link (`npm run signin-link` prints one in development), and what a signed-in
person can see is decided by RLS, not by the page. Its screens live in
`app/src/review/`, which is a module rather than a page for the reason
`app/src/builder/` is: its own palette, its own states, its own routes.

Every row records the **edition it was written in** — derived from the path it
came from, `/ko/are-you-in` being Korean — because the reply has to go back in
that language. The desk chrome itself switches EN · KO; the rows never do.

**"Published" and "on the site" are two different facts, and the desk keeps them
apart.** `stories` and `story_entries` are different tables and the gap between
them is editorial — a permalink, a headline, a topic and a summary the form never
asked for. `/review/publish/:id` is where somebody writes those: it derives what
it can, shows the story alongside the whole way down, and the last look names the
three or four places the press puts it before it puts it anywhere. A row that was
decided before that flow existed says so rather than claiming to be live.

`npm run promote-story` still prints the same SQL for anyone who would rather
read it before running it — both build the row through
`app/src/lib/story-promotion.ts`, so the two cannot disagree about its shape.

**The stories tab is one list of stories, not one table.** It reads both —
what visitors sent (`stories`) and what the site is serving (`story_entries`) —
joins them on the permalink, and shows each story once, in three runs:
**waiting** is the work, **on the site** is what a visitor can read right now,
and **not on the site** is everything else that exists (declined, taken down, or
decided before anything could carry it across). Most of the collection is in no
queue at all: it predates the submission form.

A story that is up carries the other set of actions on the same row — correct a
headline in either edition, change the date, topic or format, put a new picture
on it (uploaded into the `story-media` bucket, or an address typed in, with the
current one shown so a wrong address cannot pass for a right one), take it off
the site and put it back, mark it still being written, and curate the wall of
cards at the foot of `/story`. That wall was "the twelve most recent" and
nothing else until now; a card can be pinned and moved, and `Pin these 12` fixes
the wall as it stands so a thirteenth story stops pushing one off. **Pinning
puts a card at the front**, because the wall has twelve places and a pin that
merely joined the end of a full run was a button that changed no page. A story
published after that is on the site but not on the wall until somebody pins it
or unpins one — which the publishing screen's last look now says, with the
count, rather than leaving it to be discovered. Which twelve
the desk calls the wall is [`app/src/lib/story-wall.ts`](app/src/lib/story-wall.ts)
— the same function the page draws from, so the two cannot come to disagree.

**A story nobody sent** is written at `/review/add`, reached from the list. It
is the other door into the same table: most of the collection came through
`site/data/stories.js` and the seed, so adding one IN wrote itself used to mean
editing a file and re-running two scripts. The screen asks for what nothing can
derive — permalink, headline, topic, format, the words, a picture — and, unlike
publishing a submission, **places a point on the Constellation by default**: a
story the desk sits down to write is being put on the site deliberately.

**One list is still two facts.** A row says separately what was decided in the
queue and where the story actually is, because those come apart: `Published ·
Taken off the site` is a real state somebody chose. An edited row also says it
has stopped following `site/data`; see [`SUPABASE.md`](SUPABASE.md).

## Not included (internal, by prior decision)

`IN Brief.*`, `IN-Workshop Brief.*`, `IN Brand Guideline.*`, `Content Register`,
`IN Promotion Strategy`, `Promo`, option/study files, `_ARCHIVE-*`.
