/**
 * Writes the content map in CONTENT.md from the page models.
 *
 *   node scripts/content-map.mjs           rewrite the table
 *   node scripts/content-map.mjs --check    verify only; non-zero if stale
 *
 * Two documents used to say which page reads which table: CONTENT.md, by hand,
 * and the pages themselves, by importing a hook. They disagreed within a month
 * of being written, which is the normal fate of a hand-kept table.
 *
 * So the prose is generated from `src/lib/page-model.ts`, and this script also
 * checks that file against `src/pages/registry.ts` — a route with no model, or
 * a model with no route, fails the run. Adding a page therefore fails loudly
 * here rather than quietly leaving a page out of the map.
 *
 * The route list is read out of registry.ts as text rather than imported: that
 * file's values are `lazy(() => import('./Page'))`, and resolving it from node
 * would mean resolving React and seventy page modules to learn seventy strings.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src');
const DOC = join(HERE, '..', '..', 'CONTENT.md');

const BEGIN = '<!-- begin generated: scripts/content-map.mjs -->';
const END = '<!-- end generated -->';

const check = process.argv.includes('--check');

const { PAGE_MODELS } = await import(new URL('../src/lib/page-model.ts', import.meta.url).href);

/* ------------------------------------------------------- routes vs. models */

const registry = readFileSync(join(SRC, 'pages', 'registry.ts'), 'utf8');
const routes = [...registry.matchAll(/^ {2}"([^"]+)": lazy\(/gm)].map((m) => m[1]);

if (!routes.length) throw new Error('no routes found in pages/registry.ts — did its format change?');

const modelled = new Set(Object.keys(PAGE_MODELS));
const missing = routes.filter((route) => !modelled.has(route));
const orphaned = [...modelled].filter((route) => !routes.includes(route));

if (missing.length || orphaned.length) {
  for (const route of missing) console.error(`!! ${route} is a route with no entry in page-model.ts`);
  for (const route of orphaned) console.error(`!! ${route} is modelled but is not a route`);
  console.error('');
  console.error('Add or remove the entries in src/lib/page-model.ts, then re-run.');
  process.exit(1);
}

/* ------------------------------------------------------------------ tables */

const SECTIONS = [
  ['home', 'Home'],
  ['start-within', 'Start Within'],
  ['share-space', 'Share the Space'],
  ['serve-whole', 'Serve the Whole'],
  ['connect', 'Connect'],
];

const code = (text) => '`' + text + '`';

/** `news` + feed `home`, as the table cell spells it. */
function tableCell(entry) {
  return code(entry.table) + (entry.feed ? ` (feed ${code(entry.feed)})` : '');
}

/**
 * One row per page, with the language twins folded together.
 *
 * `/` and `/ko` are one page in two languages reading the same rows, so they
 * are one line — which is how the map was written by hand, and it reads better
 * than the same sentence twice.
 */
function fold(pick) {
  const groups = new Map();

  for (const [route, model] of Object.entries(PAGE_MODELS)) {
    const entries = pick(model);
    if (!entries.length) continue;

    const key = [model.section, model.title, ...entries.map((e) => `${e.table}/${e.feed ?? ''}/${e.drives}`)].join('|');
    const group = groups.get(key);
    if (group) group.routes.push(route);
    else groups.set(key, { section: model.section, title: model.title, entries, routes: [route] });
  }

  return collapse([...groups.values()]);
}

/**
 * Folds a family of pages that read the same thing into one row.
 *
 * Eight project detail pages each read `projects` for the same rail, and eight
 * identical lines is a table nobody finishes reading. Only families of four or
 * more collapse — below that, naming the pages is shorter than describing them.
 */
function collapse(groups) {
  const out = [];
  const families = new Map();

  for (const group of groups) {
    const key = [group.section, ...group.entries.map((e) => `${e.table}/${e.feed ?? ''}/${e.drives}`)].join('|');
    const family = families.get(key);
    if (family) family.push(group);
    else families.set(key, [group]);
  }

  for (const family of families.values()) {
    if (family.length < 4) {
      out.push(...family);
      continue;
    }
    const routes = family.flatMap((group) => group.routes);
    out.push({
      section: family[0].section,
      title: `${familyName(routes)} (×${family.length})`,
      entries: family[0].entries,
      routes,
    });
  }

  return out;
}

/** `/project/unc`, `/project/ctn` → `Project detail`. */
function familyName(routes) {
  const segment = routes[0].split('/').filter(Boolean)[0] ?? 'page';
  return `${segment[0].toUpperCase()}${segment.slice(1)} detail`;
}

function rows(groups) {
  const lines = [];
  for (const [section, heading] of SECTIONS) {
    const inSection = groups.filter((group) => group.section === section);
    if (!inSection.length) continue;

    lines.push(`| **${heading}** | | | |`);
    for (const group of inSection) {
      const paths = group.routes.map(code).join(', ');
      group.entries.forEach((entry, i) => {
        lines.push(
          i === 0
            ? `| ${group.title} | ${paths} | ${tableCell(entry)} | ${entry.drives} |`
            : `| | | ${tableCell(entry)} | ${entry.drives} |`,
        );
      });
    }
  }
  return lines;
}

const reads = fold((model) => model.reads ?? []);
const writes = fold((model) => model.writes ?? []);
const gaps = fold((model) => model.gaps ?? []);

const readTables = [...new Set(reads.flatMap((g) => g.entries.map((e) => e.table)))].sort();
const pageCount = Object.keys(PAGE_MODELS).length;
const dataPages = new Set([...reads, ...writes].flatMap((g) => g.routes)).size;

const block = [
  BEGIN,
  '',
  `Generated from [\`app/src/lib/page-model.ts\`](app/src/lib/page-model.ts) by`,
  '`node scripts/content-map.mjs`. Edit the model, re-run, commit both.',
  '',
  `${dataPages} of ${pageCount} pages read or write a table; the rest carry their copy in the`,
  'component. Every table listed under **Reads** is watched while a page that reads it',
  'is open, so an edit in the Table Editor arrives without a reload.',
  '',
  '### Reads',
  '',
  '| Page | Route | Table | What comes from it |',
  '|---|---|---|---|',
  ...rows(reads),
  '',
  '### Writes',
  '',
  '| Page | Route | Table | What goes into it |',
  '|---|---|---|---|',
  ...rows(writes),
  '',
];

if (gaps.length) {
  block.push(
    '### Not in the database yet',
    '',
    'Content that belongs in a table and is still written into the page. Declared as',
    '`gaps` in the model, so it is a list rather than a memory.',
    '',
    '| Page | Route | Table it should read | What is hard-coded |',
    '|---|---|---|---|',
    ...rows(gaps),
    '',
  );
}

block.push(`Tables read by at least one page: ${readTables.map(code).join(', ')}.`, '', END);

/* ------------------------------------------------------------------ output */

const doc = readFileSync(DOC, 'utf8');
const start = doc.indexOf(BEGIN);
const end = doc.indexOf(END);

if (start === -1 || end === -1) {
  console.error(`!! CONTENT.md has no generated block. Add these two lines where the map belongs:`);
  console.error(`   ${BEGIN}`);
  console.error(`   ${END}`);
  process.exit(1);
}

const next = doc.slice(0, start) + block.join('\n') + doc.slice(end + END.length);

if (next === doc) {
  console.log(`CONTENT.md is up to date — ${pageCount} pages, ${readTables.length} tables read.`);
} else if (check) {
  console.error('!! CONTENT.md is out of date. Run: node scripts/content-map.mjs');
  process.exit(1);
} else {
  writeFileSync(DOC, next);
  console.log(`CONTENT.md rewritten — ${pageCount} pages, ${readTables.length} tables read, ${gaps.length} gaps.`);
}
