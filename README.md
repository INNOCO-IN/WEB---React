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

Vite + React 19 + TypeScript + React Router. Scripts: `dev`, `build` (typecheck
+ build), `preview`, `lint`, `typecheck`.

All 71 routes, both languages, with real URLs:

```
/                     /workshop            /workshop/mobius-making
/manifesto            /story               /story/all  /story/submit
/mewe                 /project             /project/food-revolution
/collectives          /community           /community/bridge-builders
/constellation        /news                /connect
/ko/…                 every EN route has a Korean twin where one exists
```

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
and uploads to the `story-media` bucket.

## Not included (internal, by prior decision)

`IN Brief.*`, `IN-Workshop Brief.*`, `IN Brand Guideline.*`, `Content Register`,
`IN Promotion Strategy`, `Promo`, option/study files, `_ARCHIVE-*`.
