/**
 * Pulls the copy out of the detail pages a template took over.
 *
 *   node scripts/extract-detail-pages.mjs
 *
 * Two families of pages were the same page over and over: five project briefs
 * and seven community write-ups, identical markup, the only difference being
 * the words in them. Each family is one template now — see
 * src/pages/templates/ — and this is where the words come from, read out of
 * `site/` so the legacy page stays the thing you edit and nothing here is
 * transcribed by hand.
 *
 * Emits:
 *   src/lib/content/project-details.ts
 *   src/lib/content/community-details.ts
 *
 * What a page carries that its table row does not: the chips above the title,
 * the lede, the fact cards, and where the footer ribbon sits. Title and slug
 * come along too, so the page renders in full before the database answers —
 * the same rule the other bundled content follows.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeFor } from './lib/routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', 'site');
const CONTENT = join(HERE, '..', 'src', 'lib', 'content');

/**
 * Hex → design-token name.
 *
 * The legacy pages name their colours in hex; the design system names the same
 * fourteen in `styles/tokens/colors.css`. Translating on the way out means a
 * template asks for `--color-gold` and a palette change reaches it, rather
 * than freezing `#F0961E` into a second place it has to be corrected.
 */
const TOKENS = {
  '#FAF4E2': 'paper', '#F3EAD0': 'paper-dim', '#2E3B40': 'ink',
  '#1E8A86': 'teal', '#146560': 'teal-dark', '#E6328C': 'magenta',
  '#1E648C': 'deepblue', '#46325A': 'plum', '#3C8246': 'green',
  '#F0D23C': 'yellow', '#FAB414': 'amber', '#D21E28': 'red',
  '#1E5A64': 'slate', '#3C5A46': 'forest', '#F05A28': 'orange',
  '#966432': 'tan', '#F0961E': 'gold', '#DC3C28': 'crimson',
};

/** `#F0961E` → `gold`, and anything unrecognised straight through. */
const token = (hex) => (hex ? TOKENS[hex.toUpperCase()] ?? hex : null);

/** Collapses the whitespace an HTML text node is allowed to carry. */
function text(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The last path segment of a page's route — `/community/animators` → `animators`. */
const slugOf = (file) => (routeFor(file) ?? '').split('/').filter(Boolean).pop() ?? '';

/**
 * The languages a detail page can be written in.
 *
 * Until the 2026 design there was only English: the templates served
 * `/project/:slug` and `/community/:slug` and nothing else, because there was
 * no Korean page to serve. There is now, for all twelve, so the records are
 * keyed `slug:lang` — the same shape workshop-details.ts has always used.
 *
 * The rules below turn out to need no Korean variants. They key on structure —
 * the hero's two hex values, the `border-top` on a fact card, the ink pill —
 * rather than on the font stack, which is the thing that differs.
 */
const LANGS = ['EN', 'KO'];

/**
 * The parts both families share: a coloured hero, a heading over a grid of
 * fact cards, one optional link onward, and a footer ribbon.
 *
 * `chip` differs between them — projects list several in a flex row, a
 * community shows one status pill — so each family passes its own matcher.
 */
function common(file, { chips }) {
  const html = readFileSync(join(SITE, file), 'utf8');

  const hero = /<section style="background: (#[0-9A-Fa-f]{6}); color: (#[0-9A-Fa-f]{6});">([\s\S]*?)<\/section>/.exec(html);
  if (!hero) throw new Error(`${file}: no hero section`);

  const title = text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(hero[3])?.[1] ?? '');
  const lede = text(/<p[^>]*>([\s\S]*?)<\/p>/.exec(hero[3])?.[1] ?? '');

  // The heading over the fact cards — 'The brief', 'What formed'.
  const briefLabel = text(/<div style="font-family: 'Archivo'[^"]*font-size: 26px;[^"]*">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '');

  const brief = [...html.matchAll(
    /<div style="border-top: 1\.5px[^"]*">\s*<div[^>]*>([\s\S]*?)<\/div>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/div>/g,
  )].map((m) => ({ label: text(m[1]), body: text(m[2]) }));

  // The ink pill is the one link onward, wherever the page puts it. It is
  // content rather than chrome — only some pages have one — so it is
  // extracted rather than written into the template as a special case.
  const linkMatch = /<a href="([^"]+)"[^>]*background: #2E3B40[^"]*">([\s\S]*?)<\/a>/.exec(html);
  const link = linkMatch ? { label: text(linkMatch[2]), to: routeFor(linkMatch[1]) ?? '/' } : null;

  // The way back to the index, above the title. Its wording is the page's —
  // '← All Projects', '← 프로젝트 전체' — so it travels with the copy rather
  // than being written into the template, where it could only be English.
  const backMatch = /<a href="([^"]+)"[^>]*>\s*(←[^<]*)<\/a>/.exec(html);
  const back = backMatch ? { label: text(backMatch[2]), to: routeFor(backMatch[1]) ?? '/' } : null;

  const footer = /<dc-import name="Footer"([^>]*)>/.exec(html)?.[1] ?? '';

  return {
    slug: slugOf(file),
    accent: token(hero[1]),
    /** Whether the hero's text sits as paper-on-colour or ink-on-colour. */
    ink: token(hero[2]),
    chips: chips(hero[3]),
    title,
    lede,
    briefLabel,
    brief,
    back,
    link,
    loop: /loop="([^"]+)"/.exec(footer)?.[1] ?? null,
    ctaAccent: token(/cta="(#[0-9A-Fa-f]{6})"/.exec(footer)?.[1] ?? null),
  };
}

/* ------------------------------------------------------------------ families */

const FAMILIES = [
  {
    name: 'project',
    constant: 'PROJECT_DETAILS',
    type: 'ProjectDetail',
    file: 'project-details.ts',
    template: 'ProjectDetail',
    chipDoc: "Chips above the title: 'Action research', 'Campaign'.",
    // A flex row of pills, each its own span.
    chips: (hero) =>
      [...hero.matchAll(/<span style="background: rgba\(46,59,64,0\.14\)[^"]*">([\s\S]*?)<\/span>/g)].map((m) => text(m[1])),
    pages: [
      'Project-BridgeBuilder-Program.EN.dc.html',
      'Project-CTN.EN.dc.html',
      'Project-GYEM.EN.dc.html',
      'Project-I-Grow-Seed.EN.dc.html',
      'Project-tasmena.EN.dc.html',
    ],
  },
  {
    name: 'community',
    constant: 'COMMUNITY_DETAILS',
    type: 'CommunityDetail',
    file: 'community-details.ts',
    template: 'CommunityDetail',
    chipDoc: "The status pill: 'Continued', 'On hold'. At most one.",
    // One pill, inline-flex, paper on the hero colour.
    chips: (hero) => {
      const m = /<div style="display: inline-flex;[^"]*">([\s\S]*?)<\/div>/.exec(hero);
      return m ? [text(m[1])] : [];
    },
    pages: [
      'Community-Animators.EN.dc.html',
      'Community-BridgeBuilders.EN.dc.html',
      'Community-Facilitators.EN.dc.html',
      'Community-IN-Collectives.EN.dc.html',
      'Community-Nepal-Youth-Cluster.EN.dc.html',
      'Community-Open-Studio.EN.dc.html',
      'Community-UAE-Youth-Cluster.EN.dc.html',
    ],
  },
];

/* ------------------------------------------------------------------- output */

for (const family of FAMILIES) {
  const details = {};
  for (const page of family.pages) {
    for (const lang of LANGS) {
      const file = page.replace('.EN.', `.${lang}.`);
      // A checkout without the Korean edition of a page is not an error — the
      // template falls back to English for a slug it has no Korean record for.
      if (!existsSync(join(SITE, file))) continue;

      const detail = common(file, family);
      // The route is the English one: `Project-CTN.KO` answers at
      // `/ko/project/ctn`, so its last segment is the same slug.
      if (!detail.slug) throw new Error(`${file}: no route, so no slug`);
      detail.lang = lang;
      details[`${detail.slug}:${lang}`] = detail;
    }
  }

  writeFileSync(
    join(CONTENT, family.file),
    `// Generated by scripts/extract-detail-pages.mjs — do not edit by hand.
// The copy behind src/pages/templates/${family.template}.tsx, read out of the
// legacy pages in site/. Edit the legacy page and re-run the script.

import type { BriefFact, DetailLink } from './detail-types';
export type { BriefFact, DetailLink } from './detail-types';

/**
 * What a ${family.name}'s page says that its \`${family.name === 'project' ? 'projects' : 'communities'}\` row does not carry.
 *
 * The row holds what the card walls need — title, blurb, accent, route. This
 * holds what only the full page shows. Both are keyed by slug.
 */
export interface ${family.type} {
  slug: string;
  /** Which edition this record is the copy for. */
  lang: 'EN' | 'KO';
  /** Design-token name for the hero band — \`gold\`, \`red\`. */
  accent: string;
  /** Token name for the hero's text: \`ink\` on a light band, \`paper\` on a dark one. */
  ink: string;
  /** ${family.chipDoc} */
  chips: string[];
  title: string;
  lede: string;
  /** The heading over the fact cards — 'The brief', 'What formed'. */
  briefLabel: string;
  brief: BriefFact[];
  /** The way back to the index, in this page's own words. */
  back: DetailLink | null;
  link: DetailLink | null;
  /** Where the footer ribbon sits on this page, 0–1. */
  loop: string | null;
  /** Design-token name for the closing band. */
  ctaAccent: string | null;
}

/** Keyed \`slug:lang\` — 'animators:KO'. */
export const ${family.constant}: Record<string, ${family.type}> = ${JSON.stringify(details, null, 2)};
`,
  );

  for (const d of Object.values(details)) {
    console.log(`${(d.slug + ':' + d.lang).padEnd(28)} ${d.accent}/${d.ink} · ${d.chips.join('/') || '—'} · ${d.brief.length} facts${d.link ? ' · 1 link' : ''}`);
  }
  console.log(`${Object.keys(details).length} ${family.name} details → src/lib/content/${family.file}\n`);
}
