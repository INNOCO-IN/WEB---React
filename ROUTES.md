# IN Website — Route Map

Two route tables exist, because two trees render the site.

- **`app/`** — React Router. Clean paths, listed below. Every legacy URL
  redirects to its new route, so nothing that ever linked to the site breaks.
- **`site/`** — static files. The route *is* the filename, and Vercel still
  serves this one. See [Deploy](README.md#deploy).

Both tables are generated from `site/` by `app/scripts/convert-pages.mjs`; the
machine-readable versions are [`app/src/lib/route-map.ts`](app/src/lib/route-map.ts)
and [`app/src/pages/registry.ts`](app/src/pages/registry.ts).

70 routes: 47 English, 23 Korean. Plus 3 redirect-only URLs.

Fifty-four entries serve them, because three of the entries are `:slug`
patterns. Twenty pages that were the same page with different words are three
hand-written templates now — see [Templates](#templates) at the end.

## English

```
/                                          Home
/manifesto                                 Manifesto
/mewe                                      MEWE
/collectives                               IN-Collectives
/action-research                           Action-Research

── SHARE THE SPACE ───────────────────────
/workshop                                  Workshop index          ← reads `workshops`
  /workshop/mobius-making                  the signature workshop
  /workshop/pathfinder
  /workshop/jungle-jam
  /workshop/metanoia
  /workshop/bucket-list
  /workshop/heros-journey
  /workshop/light-shadow-shift
  /workshop/second-life
  /workshop/shadow-shifter
  /workshop/two-wings
/story                                     Story
  /story/all                               Story index             ← reads `story_entries`
  /story/submit                            Story submission        → writes `stories`
  /story/this-is-us                        One story, in full
/protagonist                               Protagonist

── SERVE THE WHOLE ───────────────────────
/project                                   Project index
  /project/asia-exchange                   ⟵ these twelve share the
  /project/bridge-builder-program             "All projects" rail,
  /project/ctn                                which reads `projects`
  /project/food-revolution
  /project/gyem
  /project/i-grow-seed
  /project/jungle-jam
  /project/light-shadow-shift-womens-retreat
  /project/shadow-shifter
  /project/tasmena
  /project/uae-youth-social-innovation
  /project/unc
  /project/unc-documentary
/community                                 Community               ← reads `communities` + `news`
  /community/all                           Community index
  /community/animators
  /community/bridge-builders
  /community/facilitators
  /community/in-collectives
  /community/nepal-youth-cluster
  /community/open-studio
  /community/uae-youth-cluster
/constellation                             Constellation           ← reads `constellation_points`
/news                                      News                    ← reads `news`

── FLIP CONNECT ──────────────────────────
/connect                                   Are you IN?             → writes `submissions`
```

## Korean

Every Korean page is the English route under `/ko`:

```
/ko                    /ko/workshop          /ko/workshop/:slug   (10)
/ko/manifesto          /ko/story             /ko/story/all
/ko/mewe               /ko/protagonist       /ko/project
/ko/collectives        /ko/community         /ko/constellation
/ko/news               /ko/connect
```

Language is derived from the path, in one place — [`app/src/lib/lang.ts`](app/src/lib/lang.ts).
Nothing else decides: not a prop written into a generated page, not a
`startsWith('/ko')` in a template, not a default in a card.

Three locales now: `en`, `zh-TW`, `ko`. English keeps the bare root because
every inbound link and the whole redirect table point at it; `/en/…` is
understood and redirected to the canonical spelling. To make English prefixed
for real, set `LOCALE_PREFIX.en` in
[`app/src/i18n/locales.ts`](app/src/i18n/locales.ts) — the router, the
switcher, `hreflang` and the canonical tags all read it from there.

Traditional Chinese has one page, `/zh-tw/news`, served by the page builder.
Everywhere else the switcher shows 繁中 disabled rather than linking into a
language that has nothing to say.

### Falling back

Fifteen English routes have no Korean twin — every `Project-*` brief, the seven
`Community-*` pages, `/community/all`, `/story/submit`, `/story/this-is-us`,
`/action-research`. Three things degrade rather than break:

- **The EN/KR switch** gives up a segment at a time. Same page if it exists,
  else the section above it (`/project/food-revolution` → `/ko/project`), and
  the Korean home only when there is nothing in between. When it is not the
  same page the link is dimmed and says so, instead of silently moving you.
- **Card links** take the twin where there is one and stay English where there
  is not — which is why `/ko/workshop` links to `/ko/workshop/metanoia` but
  `/ko/project` still links to the English brief.
- **Row copy** falls back field by field. A row with a Korean title and no
  Korean blurb shows the Korean title and the English blurb. `inLang` in
  [`app/src/lib/content/types.ts`](app/src/lib/content/types.ts) is the only
  rule, so a page, a card and a rail reading the same row cannot disagree.
- **Builder pages** fall back the same way, per binding key, and record which
  values were borrowed so the editor can mark them. See
  [`app/src/builder/resolve.ts`](app/src/builder/resolve.ts).

`hreflang` is the exception that does not degrade: it is emitted only for a
real twin, because pointing it at a section would tell a search engine that a
project brief and the project index are the same document in two languages.

This replaced a generated `LANG_ALTERNATES` table, which could only hold the
pairs the converter knew about — never a `:slug` route — so all fifteen of
those routes used to drop you on the Korean home page.

## Redirects

Every `*.dc.html` filename the static site ever served maps to its new route.
Three have no page of their own:

```
/index.html               → /
/kr.html                  → /ko
/ME=WE.EN.dc.html         → /mewe     (superseded by MEWE.EN)
```

Anything else that looks like a page but is not in the table renders the 404
page inside the normal chrome, so a mistyped URL still gives you the nav.

## Not routes

Shared components and design references, converted or not: `Nav`, `Nav-KO`,
`Footer`, `Footer-KO`, `ProjectIndexRail` (all now React components under
`app/src/components/`), and `Cards.EN`, `Card System Prototype.EN`,
`IN Design System`, `Story Submission Brief.EN` (design references, not ported).

## What changed from the static route map

- **The six orphans are gone.** `Project-CTN`, `Project-GYEM`,
  `Project-I-Grow-Seed` and `Project-tasmena` were finished pages missing from
  the rail's hard-coded list of eight, so nothing linked to them. The rail now
  reads the `projects` table, so a project is listed because it exists.
  `Story-This-Is-Us` is reachable from the story index. `ME=WE` redirects.
- **Language is a path, not a filename.** `/ko/workshop` rather than
  `Workshop.KO.dc.html`, which is what makes one React route serve both.
- **Detail pages nest.** `/workshop/:slug`, `/project/:slug`, `/community/:slug`.

## Templates

Three families of pages were the same page over and over — same markup, same
order, different words. Normalising the strings out of five of the project
briefs left files that were byte-identical apart from the component name.

Each family is one hand-written template now. The pages stay in `site/`: the
converter still reads them to resolve links and keep every legacy URL
redirecting, and their copy is still *extracted* from them rather than
transcribed. What stops is emitting a component per page.

| Route | Template | Pages it replaced |
|---|---|---|
| `/project/:slug` | `ProjectDetail` | BridgeBuilder Program, CTN, GYEM, I Grow Seed, tasmena |
| `/community/:slug` | `CommunityDetail` | Animators, BridgeBuilders, Facilitators, IN-Collectives, Nepal Youth Cluster, Open Studio, UAE Youth Cluster |
| `/workshop/:slug`, `/ko/workshop/:slug` | `WorkshopDetail` | Hero's Journey, Metanoia, Möbius Making, Two Wings — in both languages |

The workshop template serves both languages from one component, because the
Korean page is the same layout with the words translated. It reads the language
off the path and the copy is keyed `slug:lang`.

Which pages a template has taken over is declared in
[`app/scripts/lib/routes.mjs`](app/scripts/lib/routes.mjs) (`TAKEN_OVER`), and
the copy is pulled out by `extract-detail-pages.mjs` and
`extract-workshop-pages.mjs`.

**A static path still wins.** React Router ranks a literal route above a
dynamic one, so the eight richer project pages, the six workshop pages on other
layouts, and `/community/all` keep their own components and never land on a
template.

### Not templated, and why

- **Jungle Jam, Shadow Shifter, Light Shadow Shift** share a second workshop
  layout (ten sections, no image slot); **Bucket List** and **Second Life** a
  third (nine sections, two image slots); **Pathfinder** is its own (eleven).
  Each needs its own template — this one does not fit them.
- **Manifesto, MEWE, Home, Story** and the other EN/KO twins are still a
  component each per language.
