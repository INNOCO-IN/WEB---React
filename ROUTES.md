# IN Website — Route Map

Static site (Vercel). Routes = file paths inside `site/`, served at the root —
`vercel.json` rewrites `/x` to `/site/x`, so the URLs below are unchanged.
`⚠ orphan` = no page links to it (unreachable by clicking).

```
/                                          → index.html (Home)
/kr.html                                   → Korean stub
/zh.html                                   → Chinese stub

── START WITHIN ──────────────────────────
/Manifesto.EN.dc.html                      Manifesto
/ME=WE.EN.dc.html                          ME=WE
/Collectives.EN.dc.html                    IN-Collectives
/Action-Research.EN.dc.html                Action-Research          ⚠ orphan

── SHARE THE SPACE ───────────────────────
/Workshop.EN.dc.html                       Workshop (index)
  /Workshop-Mobius-Making.EN.dc.html
  /Workshop-Pathfinder.EN.dc.html
  /Workshop-Jungle-Jam.EN.dc.html
  /Workshop-Metanoia.EN.dc.html
  /Workshop-Bucket-List.EN.dc.html         ⚠ orphan
  /Workshop-Heros-Journey.EN.dc.html       ⚠ orphan
  /Workshop-Light-Shadow-Shift.EN.dc.html  ⚠ orphan
  /Workshop-Second-Life.EN.dc.html         ⚠ orphan
  /Workshop-Shadow-Shifter.EN.dc.html      ⚠ orphan
  /Workshop-Two-Wings.EN.dc.html           ⚠ orphan
/Story.EN.dc.html                          Story
  /Story-Index.EN.dc.html
  /Story-Submission.EN.dc.html
  /Story-This-Is-Us.EN.dc.html
/Protagonist.EN.dc.html                    Protagonist

── SERVE THE WHOLE ───────────────────────
/Project.EN.dc.html                        Project (index)
  /Project-Asia-Exchange.EN.dc.html
  /Project-BridgeBuilder-Program.EN.dc.html
  /Project-Food-Revolution.EN.dc.html
  /Project-Jungle-Jam.EN.dc.html
  /Project-Shadow-Shifter.EN.dc.html
  /Project-Light-Shadow-Shift-Womens-Retreat.EN.dc.html
  /Project-UAE-Youth-Social-Innovation.EN.dc.html
  /Project-UNC.EN.dc.html
  /Project-UNC-Documentary.EN.dc.html
  /Project-CTN.EN.dc.html                  ⚠ orphan
  /Project-GYEM.EN.dc.html                 ⚠ orphan
  /Project-I-Grow-Seed.EN.dc.html          ⚠ orphan
  /Project-tasmena.EN.dc.html              ⚠ orphan
/Community.EN.dc.html                      Community
  /Community-Index.EN.dc.html
  /Community-BridgeBuilders.EN.dc.html
  /Community-Facilitators.EN.dc.html
  /Community-Animators.EN.dc.html
  /Community-IN-Collectives.EN.dc.html
  /Community-Open-Studio.EN.dc.html
  /Community-Nepal-Youth-Cluster.EN.dc.html
  /Community-UAE-Youth-Cluster.EN.dc.html
/Constellation.EN.dc.html                  Constellation

── FLIP CONNECT ──────────────────────────
/Are-you-IN.EN.dc.html                     Are you IN?  (footer CTA · 51 inbound, most-linked)

── SHARED / REFERENCE (not routes) ───────
Nav.dc.html, Footer.dc.html, ProjectIndexRail.dc.html   shared components
Cards.EN.dc.html, Card System Prototype.EN.dc.html,
IN Design System.dc.html                                design reference
```

## Notes
- 49 page routes + Home + 2 language stubs.
- 13 orphans (⚠): unreachable by clicking — need to be linked from an index/card, or removed.
- Dynamic `{{ }}` links (resolved at runtime, not in the static graph): Constellation, Story-This-Is-Us, and the Nav + ProjectIndexRail components.
- No broken/missing link targets otherwise.
- Full machine-readable graph: `site/data/link-map.json`.
