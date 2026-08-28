/**
 * Pulls the copy out of the workshop detail pages.
 *
 *   node scripts/extract-workshop-pages.mjs
 *
 * Four workshops — Hero's Journey, Metanoia, Möbius Making and Two Wings —
 * ship the same page in two languages: eight files, 305 lines each, of which
 * about forty-six lines differ and every one of those is a word or a colour.
 * They are one template now (src/pages/templates/WorkshopDetail.tsx), and this
 * is where its words come from.
 *
 * Emits:
 *   src/lib/content/workshop-details.ts
 *
 * Keyed `slug:lang`, because a workshop's Korean page is a translation of the
 * same layout rather than a different page — which is what lets one component
 * serve both and the EN/KR switch land on the same workshop.
 *
 * The other six workshop pages keep their own components: Jungle Jam, Shadow
 * Shifter and Light Shadow Shift share a second layout, Bucket List and Second
 * Life a third, and Pathfinder is its own. Each would need its own template;
 * none of them fits this one.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeFor, parseFile } from './lib/routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', 'site');
const CONTENT = join(HERE, '..', 'src', 'lib', 'content');

/** The four workshops on this layout, in both languages. */
const WORKSHOPS = ['Workshop-Heros-Journey', 'Workshop-Metanoia', 'Workshop-Mobius-Making', 'Workshop-Two-Wings'];
const LANGS = ['EN', 'KO'];

/** Hex → design-token name; see extract-detail-pages.mjs for the reasoning. */
const TOKENS = {
  '#FAF4E2': 'paper', '#F3EAD0': 'paper-dim', '#2E3B40': 'ink',
  '#1E8A86': 'teal', '#146560': 'teal-dark', '#E6328C': 'magenta',
  '#E5188C': 'magenta-hot', '#1E648C': 'deepblue', '#46325A': 'plum',
  '#3C8246': 'green', '#F0D23C': 'yellow', '#FAB414': 'amber',
  '#D21E28': 'red', '#1E5A64': 'slate', '#3C5A46': 'forest',
  '#F05A28': 'orange', '#966432': 'tan', '#F0961E': 'gold',
  '#DC3C28': 'crimson', '#C8791A': 'tan-warm', '#F7C7D7': 'blush',
};

const token = (hex) => (hex ? TOKENS[hex.toUpperCase()] ?? hex : null);

/**
 * The serif stack, as either language spells it.
 *
 * A Korean page adds Noto to the family — `'Newsreader', 'Noto Serif KR',
 * serif` — so a pattern that names the English stack exactly matches nothing
 * on half the pages, and does it silently: the section comes back empty rather
 * than failing. Every rule below that keys on the serif goes through this.
 */
const SERIF = "font-family: 'Newsreader',[^;]*;";

/** Collapses the whitespace an HTML text node is allowed to carry. */
function text(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&uarr;/g, '↑').replace(/&darr;/g, '↓')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A paragraph that carries emphasis, as a list of runs.
 *
 * The closing line under the Loop italicises a term and sets a quotation in
 * the accent colour. Storing it as a string would lose both; storing it as
 * HTML would mean the template rendering markup out of content. Runs keep it
 * data, and keep the template in charge of what emphasis looks like.
 */
function runs(html) {
  const out = [];
  const re = /<(em|span)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let at = 0;
  let m;

  while ((m = re.exec(html))) {
    const before = text(html.slice(at, m.index));
    // Whitespace between runs is meaningful — it is the space between words.
    if (before || /\s$/.test(html.slice(at, m.index))) {
      out.push({ text: html.slice(at, m.index).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ') });
    }
    out.push({
      text: text(m[3]),
      ...(m[1] === 'em' ? { em: true } : {}),
      ...(m[1] === 'span' && /color:/.test(m[2]) ? { accent: true } : {}),
    });
    at = m.index + m[0].length;
  }

  const tail = html.slice(at).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  if (tail.trim()) out.push({ text: tail });

  return out.length ? out : [{ text: text(html) }];
}

/** The section whose opening tag contains `needle`. */
function section(html, needle, nth = 0) {
  const parts = html.split(/<section\b/).slice(1);
  const hits = parts.filter((p) => p.slice(0, 400).includes(needle));
  const body = hits[nth];
  return body ? body.slice(0, body.indexOf('</section>')) : '';
}

function detailFor(name, lang) {
  const file = `${name}.${lang}.dc.html`;
  const html = readFileSync(join(SITE, file), 'utf8');
  const route = routeFor(file);
  const slug = (route ?? '').split('/').pop();

  /* -------------------------------------------------------------- the hero */

  const hero = section(html, 'background: #');
  const accent = token(/background: (#[0-9A-Fa-f]{6})/.exec(hero)?.[1]);
  const backMatch = /<a href="([^"]+)"[^>]*text-transform: uppercase[^"]*">([\s\S]*?)<\/a>/.exec(hero);

  const eyebrow = text(/<div style="font-family: 'Archivo'[^"]*font-size: 26px;[^"]*">([\s\S]*?)<\/div>/.exec(hero)?.[1] ?? '');
  const title = text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(hero)?.[1] ?? '');
  const lede = text(/<p[^>]*>([\s\S]*?)<\/p>/.exec(hero)?.[1] ?? '');
  const pills = [...hero.matchAll(/<span style="border: 1\.5px solid rgba\(250,244,226,0\.5\)[^"]*">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
  const register = text(/<a href="#register"[^>]*>([\s\S]*?)<\/a>/.exec(hero)?.[1] ?? '');

  /* ------------------------------------------------------------- the intro */

  const intro = section(html, 'padding: 64px 28px 24px');
  const slot = /<x-import[^>]*id="([^"]+)"[^>]*placeholder="([^"]*)"[^>]*style="([^"]*)"/.exec(intro);

  /* -------------------------------------------------- what we co-design */

  const arc = section(html, 'padding: 56px 28px 24px');
  const steps = [...arc.matchAll(
    /<span style="flex: 0 0 auto; width: 52px;[^"]*background: (#[0-9A-Fa-f]{6});[^"]*">(\d+)<\/span>\s*<div style="flex: 0 0 auto; width: 190px;[^"]*font-size: (\d+(?:\.\d+)?)px;[^"]*color: (#[0-9A-Fa-f]{6});">([\s\S]*?)<\/div>\s*<div style="flex: 1 1 320px;[^"]*">([\s\S]*?)<\/div>/g,
  )].map((m) => {
    const labelHtml = m[5];
    const note = /<span[^>]*>([\s\S]*?)<\/span>/.exec(labelHtml);
    return {
      n: m[2],
      dot: token(m[1]),
      // 13px is a tracked-out word ('Ignite'); 17px is a formula ('ME ≠ WE').
      labelSize: m[3] === '13' ? 'caps' : 'formula',
      labelColor: token(m[4]),
      label: text(labelHtml.replace(/<span[\s\S]*?<\/span>/, '')),
      note: note ? text(note[1]) : null,
      noteColor: note ? token(/color: (#[0-9A-Fa-f]{6})/.exec(labelHtml.slice(labelHtml.indexOf('<span')))?.[1]) : null,
      body: text(m[6]),
    };
  });

  const closingHtml = [...arc.matchAll(new RegExp(`<p style="${SERIF} font-size: 19px; line-height: 1.55;[^"]*">([\\s\\S]*?)</p>`, 'g'))].pop()?.[1] ?? '';

  /* ------------------------------------------------------ helpful when… */

  const helpful = section(html, 'padding: 40px 28px;');
  const card = token(/background: (#[0-9A-Fa-f]{6}); padding: 44px/.exec(helpful)?.[1]);

  /* ---------------------------------------------------------- the details */

  const details = section(html, 'padding: 24px 28px 40px');
  const facts = [...details.matchAll(
    /<div style="background: #FAF4E2; padding: 22px 24px;"><div[^>]*>([\s\S]*?)<\/div><div[^>]*>([\s\S]*?)<\/div><\/div>/g,
  )].map((m) => ({ label: text(m[1]), value: text(m[2]) }));

  const noteMatch = /<p style="([^"]*margin: 16px 0 0;[^"]*)">([\s\S]*?)<\/p>/.exec(details);

  /* ------------------------------------------------------------- register */

  const cta = section(html, 'id="register"');
  const ctaLinks = [...cta.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
    label: text(m[2]),
    to: routeFor(m[1].split('#')[0]) ? routeFor(m[1].split('#')[0]) + (m[1].includes('#') ? '#' + m[1].split('#')[1] : '') : m[1],
  }));

  const footer = /<dc-import name="Footer"([^>]*)>/.exec(html)?.[1] ?? '';

  return {
    slug,
    lang,
    route,
    accent,
    back: { label: text(backMatch?.[2] ?? ''), to: routeFor(backMatch?.[1] ?? '') ?? '/workshop' },
    eyebrow,
    title,
    lede,
    pills,
    register,
    intro: {
      label: text(/<div style="font-family: 'Archivo'[^"]*font-size: 13px;[^"]*">([\s\S]*?)<\/div>/.exec(intro)?.[1] ?? ''),
      paragraphs: [...intro.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])),
      image: slot ? { id: slot[1], placeholder: slot[2], aspect: /aspect-ratio:\s*([^;]+)/.exec(slot[3])?.[1].trim() ?? '4 / 5' } : null,
    },
    codesign: {
      heading: text(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(arc)?.[1] ?? ''),
      lede: text(new RegExp(`<p style="${SERIF} font-size: 19px; line-height: 1.5;[^"]*">([\\s\\S]*?)</p>`).exec(arc)?.[1] ?? ''),
      steps,
      closing: runs(closingHtml),
    },
    helpful: {
      heading: text(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(helpful)?.[1] ?? ''),
      card,
      items: [...helpful.matchAll(new RegExp(`<span style="${SERIF} font-size: 20px;[^"]*">([\\s\\S]*?)</span>`, 'g'))].map((m) => text(m[1])),
    },
    details: {
      heading: text(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(details)?.[1] ?? ''),
      facts,
      // The credit under the grid. Matched on where it sits rather than on
      // how it is set: the English page italicises it and the Korean page does
      // not, because Korean serif has no true italic — so the slant is one of
      // the things being extracted, not a way of finding the line.
      note: text(noteMatch?.[2] ?? ''),
      noteItalic: /font-style: italic/.test(noteMatch?.[1] ?? ''),
    },
    backToTop: text(/<a href="#top"[^>]*>([\s\S]*?)<\/a>/.exec(html)?.[1] ?? ''),
    cta: {
      eyebrow: text(/<p[^>]*>([\s\S]*?)<\/p>/.exec(cta)?.[1] ?? ''),
      heading: text(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(cta)?.[1] ?? ''),
      links: ctaLinks,
    },
    loop: /loop="([^"]+)"/.exec(footer)?.[1] ?? null,
    ctaAccent: token(/cta="(#[0-9A-Fa-f]{6})"/.exec(footer)?.[1] ?? null),
  };
}

/* ------------------------------------------------------------------- output */

const details = {};
for (const name of WORKSHOPS) {
  for (const lang of LANGS) {
    const detail = detailFor(name, lang);
    if (!parseFile(`${name}.${lang}.dc.html`)) throw new Error(`${name}.${lang}: not a page file`);
    details[`${detail.slug}:${lang}`] = detail;
  }
}

writeFileSync(
  join(CONTENT, 'workshop-details.ts'),
  `// Generated by scripts/extract-workshop-pages.mjs — do not edit by hand.
// The copy behind src/pages/templates/WorkshopDetail.tsx, read out of the
// legacy pages in site/. Edit the legacy page and re-run the script.

import type { DetailLink } from './detail-types';

/** One movement of the MEWE Loop, as a workshop page lays it out. */
export interface LoopStep {
  /** Its number in the arc, '1' upward. */
  n: string;
  /** Token name for the numbered disc. */
  dot: string;
  label: string;
  /** A tracked-out word ('Ignite') or a formula ('ME ≠ WE') — they differ in size. */
  labelSize: 'caps' | 'formula';
  labelColor: string;
  /** The small line under the label, on the one step that has one. */
  note: string | null;
  noteColor: string | null;
  body: string;
}

/** A run of text in a paragraph that carries emphasis. */
export interface Run {
  text: string;
  em?: boolean;
  /** Set in the page's accent colour — the quotation at the end of the arc. */
  accent?: boolean;
}

/** One cell of the details grid. */
export interface WorkshopFact {
  label: string;
  value: string;
}

/**
 * A workshop's page, in one language.
 *
 * Four workshops share this layout, and each has an English and a Korean page
 * that are the same layout with different words — so the key is \`slug:lang\`
 * and one component serves all eight.
 */
export interface WorkshopDetail {
  slug: string;
  lang: 'EN' | 'KO';
  route: string;
  /** Token name for the hero and register bands. */
  accent: string;
  back: DetailLink;
  eyebrow: string;
  title: string;
  lede: string;
  /** The outlined pills under the lede: duration, audience, format, host. */
  pills: string[];
  /** Label on the jump-to-register button. */
  register: string;
  intro: {
    label: string;
    paragraphs: string[];
    image: { id: string; placeholder: string; aspect: string } | null;
  };
  codesign: {
    heading: string;
    lede: string;
    steps: LoopStep[];
    closing: Run[];
  };
  helpful: {
    heading: string;
    /** Token name for the card behind it. */
    card: string;
    items: string[];
  };
  details: {
    heading: string;
    facts: WorkshopFact[];
    /** The credit under the grid. */
    note: string;
    /** English slants it; Korean does not — Korean serif has no true italic. */
    noteItalic: boolean;
  };
  backToTop: string;
  cta: {
    eyebrow: string;
    heading: string;
    links: DetailLink[];
  };
  /** Where the footer ribbon sits on this page, 0–1. */
  loop: string | null;
  ctaAccent: string | null;
}

/** Keyed \`slug:lang\` — 'metanoia:KO'. */
export const WORKSHOP_DETAILS: Record<string, WorkshopDetail> = ${JSON.stringify(details, null, 2)};
`,
);

for (const d of Object.values(details)) {
  console.log(
    `${(d.slug + ':' + d.lang).padEnd(22)} ${d.accent}/${d.helpful.card} · ${d.pills.length} pills · ` +
      `${d.intro.paragraphs.length} paras · ${d.codesign.steps.length} steps · ${d.helpful.items.length} items · ` +
      `${d.details.facts.length} facts · ${d.codesign.closing.length} runs${d.intro.image ? ' · image' : ''}`,
  );
}
console.log(`\n${Object.keys(details).length} workshop pages → src/lib/content/workshop-details.ts`);
