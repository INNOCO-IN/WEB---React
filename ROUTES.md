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

The EN/KR switch in the nav and footer uses `LANG_ALTERNATES`, so it lands on
the same page in the other language rather than on the home page. Where no
Korean page exists — the `Community-*` and `Project-*` detail pages,
`/story/submit`, `/action-research` — it falls back to the Korean home.

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
