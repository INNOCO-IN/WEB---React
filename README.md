# IN Website

Two separate things live in this repo. They share no code and no build.

```
site/     the live website — static files, no build step
app/      a Vite + React + TypeScript shell — not deployed yet
schema.sql, *.md, vercel.json, .vercelignore, .gitignore   at the root
```

## `site/` — the live site

Everything that used to sit at the repo root, moved as one unit so every
relative path inside the pages still resolves. No content, colour or layout
edits.

- 79 pages: `*.EN.dc.html` / `*.KO.dc.html`, plus shared `Nav`, `Nav-KO`,
  `Footer`, `Footer-KO`, `Cards.EN`, `ProjectIndexRail`
- `IN Design System.dc.html` and `_ds/` (tokens + `_ds_bundle.js`, 12 React
  components, loaded only by `Home.EN` / `Home.KO`)
- Runtime: `support.js`, `image-slot.js`, `in-supabase.js`, `supabase-config.js`
- Entry: `index.html` (redirects to `Home.EN.dc.html`)
- Imagery: `community-img/`, `project-img/`, `story-img/`, `story-photos/`,
  `workshop-img/`, `team/`, root logo PNGs
- `data/` — including `data/stories.js`, loaded by the Story-Index pages

Note that these pages are static *files*, not static *output*: `support.js` is a
client-side runtime that pulls React 18, ReactDOM and Babel standalone from
unpkg and interprets the `<x-dc>` tree in the browser. Nothing renders with
JavaScript off. Splitting that apart is a separate job from this folder move.

## `app/` — the React shell

An empty, working scaffold. Nothing has been ported into it.

```bash
cd app && npm install && npm run dev
```

Scripts: `dev`, `build` (typecheck + Vite build to `app/dist/`), `preview`,
`lint` (oxlint), `typecheck`. Copy `app/.env.example` to `app/.env.local` for
the Supabase keys.

## Deploy

Vercel, static, no build command. `vercel.json` rewrites every request into
`site/`, so live URLs are unchanged by the move — `/Home.EN.dc.html` still
serves `site/Home.EN.dc.html`.

Cleaner alternative, if you'd rather not carry the rewrites: set **Root
Directory** to `site` in the Vercel project settings and delete the `rewrites`
block. That is a dashboard change, so it isn't done here.

`app/` is listed in `.vercelignore` because no build step ships it yet. To
deploy it later: drop that line, add a build command that outputs both trees
(`site/` copied verbatim, `app/dist/` under whatever path you choose), point
`outputDirectory` at the result, and set `base` in `app/vite.config.ts` to match
the path.

## Not included (internal, by prior decision)

`IN Brief.*`, `IN-Workshop Brief.*`, `IN Brand Guideline.*`, `Content Register`,
`IN Promotion Strategy`, `Promo`, option/study files, `_ARCHIVE-*`.

## Known state (unchanged, reported only)

- No KO version exists for `Community-*`, `Project-*` detail pages,
  `Story-Submission`, `Action-Research`; KO nav links to the EN pages.
- Colour drift across pages: magenta appears as `#E5188C` and `#E6328C`, teal as
  `#1E8A86` and `#146560`, plus several near-ink greys (`#2E3B40`, `#262A38`).
- `site/ME=WE.EN.dc.html` is still present, superseded by `MEWE.EN.dc.html`.
- No page references Supabase. `in-supabase.js`, `supabase-config.js`,
  `schema.sql` and `SUPABASE.md` describe form wiring that no page loads.
- 13 orphan routes — see `ROUTES.md`.
