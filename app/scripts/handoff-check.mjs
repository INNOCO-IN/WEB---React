/**
 * An incoming design handoff, measured against the site that already exists.
 *
 *   node scripts/handoff-check.mjs [path/to/bundle]
 *
 * `design-sync.mjs` answers "what did the design change?" once the design is
 * already in `site/`. This answers the question before that one: a bundle has
 * arrived from the design tool as its own tree, and the only safe way to take
 * it is to know first what taking it would cost.
 *
 * The cost is never the pages. It is the handful of attributes and comments
 * that are not design at all — they are this repo's wiring, written into the
 * markup because the markup is where the generator looks for them. A bundle
 * authored without the app in view cannot know about them, so it arrives
 * without them, and copying it over `site/` removes them silently: the pages
 * still render, the forms still look like forms, and nothing reaches the
 * database.
 *
 * So this reports four kinds of thing, in the order they matter:
 *
 *   hooks      wiring the bundle drops — the blocker
 *   values     controls whose value is a sentence, which is per-language
 *   inventory  pages added, gone, or renamed
 *   detail     line endings, colours with no name, assets that are not here
 *
 * Nothing is written. Deciding to take a bundle is a decision.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colourTokens } from './lib/design-tokens.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SITE = join(ROOT, 'site');

/**
 * Pages the design renamed, as `site/` spells it → as the bundle spells it.
 *
 * Without this every rename reads as one page deleted and another invented,
 * which buries the genuine additions in noise. A rename is also the one
 * difference here that costs a redirect: `/collectives` and `/protagonist`
 * are live URLs.
 */
const RENAMED = {
  Collectives: 'People',
  Protagonist: 'Pathway',
  'ME=WE': 'MEWE',
};

/** The wiring that lives in the markup because the generator reads it there. */
const HOOKS = [
  ['in-component:', 'mounts a hand-written React component on the page'],
  ['data-in-form', 'names the table the form inserts into — without it the form sends nothing'],
  ['data-in-thanks', 'what replaces the form once the row is in'],
  ['data-in-idle', 'what the status line says before anything has happened'],
  ['data-in-status', 'the slot the status line goes in'],
  ['data-value', 'the slug a chip sends, as opposed to the word printed on it'],
  ['data-hide-when', 'a block a particular answer retires'],
  ['data-scroll-form', 'a card elsewhere on the page that answers the form'],
  ['data-prefill', 'the answer that card gives'],
];

/* ------------------------------------------------------------------ files */

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function artboards(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.dc.html')).sort();
}

/** `Workshop.EN.dc.html` becomes `{ page: 'Workshop', locale: 'EN' }`. */
function split(file) {
  const m = /^(.*?)\.(EN|KO)\.dc\.html$/.exec(file);
  return m ? { page: m[1], locale: m[2] } : { page: basename(file, '.dc.html'), locale: null };
}

/** What the bundle calls the file `site/` calls this. */
function asBundled(file) {
  const { page, locale } = split(file);
  const renamed = RENAMED[page] ?? page;
  return locale ? `${renamed}.${locale}.dc.html` : `${renamed}.dc.html`;
}

/** The bundle: the path given, or the one directory below that looks like one. */
function findBundle(arg) {
  if (arg) return existsSync(join(arg, 'design')) ? join(arg, 'design') : arg;

  let found = null;
  const walk = (dir, depth) => {
    if (depth > 4 || found) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const path = join(dir, entry.name);
      if (path === SITE) continue;
      if (entry.name === 'design' && artboards(path).length > 20) {
        found = path;
        return;
      }
      walk(path, depth + 1);
    }
  };
  walk(ROOT, 0);
  return found;
}

/* ---------------------------------------------------------------- reading */

/** Every hook in one file, as the hook name to what each occurrence carries. */
function hooksIn(html) {
  // An attribute only counts where it is actually an attribute. Both kinds of
  // comment talk about these by name — the script on Are-you-IN spells the
  // rule out as `data-prefill="field=value"` — and counting that as a second
  // prefill made a page look like it had one to lose that it never had.
  // `in-component:` is the exception: it lives in a comment on purpose, so the
  // static runtime ignores what only the generator is meant to read.
  const live = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const found = new Map();
  for (const [hook] of HOOKS) {
    const pattern =
      hook === 'in-component:'
        ? /in-component:\s*([^\s>]+)/g
        : new RegExp(hook + '="([^"]*)"', 'g');
    const hits = [...(hook === 'in-component:' ? html : live).matchAll(pattern)].map((m) => m[1]);
    if (hits.length) found.set(hook, hits);
  }
  return found;
}

/** Controls whose value is a sentence rather than a slug. */
function sentenceValues(html) {
  const problems = [];

  // An <option> with no value attribute sends whatever the browser reads off
  // the element — which is the translated sentence, so the same answer given
  // in three editions arrives as three different strings.
  const bare = [...html.matchAll(/<option(?![^>]*\svalue=)[^>]*>([^<]*)</g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (bare.length) problems.push(['option without a value', bare]);

  // `field=value` is the spelling both rules use. Anything else names a
  // sentence, and a sentence is the half a translator changes.
  for (const attr of ['data-prefill', 'data-hide-when']) {
    const loose = [...html.matchAll(new RegExp(attr + '="([^"]*)"', 'g'))]
      .map((m) => m[1])
      .filter((v) => !/^[A-Za-z_][\w-]*=./.test(v));
    if (loose.length) problems.push([attr + ' not spelled field=value', loose]);
  }
  return problems;
}

/** Every local asset path the page names. */
function assetsIn(html) {
  const pattern = /(?:src|href)="(?!https?:|#|mailto:|data:|\/\/)([^"]+\.(?:png|jpe?g|gif|svg|webp|mp4|webm))"/gi;
  return [...html.matchAll(pattern)].map((m) => m[1]);
}

/* ------------------------------------------------------------------- main */

const BUNDLE = findBundle(process.argv[2]);
if (!BUNDLE) {
  console.error('No handoff bundle found. Pass the path to the one you want checked.');
  process.exit(1);
}

const here = artboards(SITE);
const there = artboards(BUNDLE);
const thereSet = new Set(there);

const common = [];
const gone = [];
for (const file of here) {
  const bundled = asBundled(file);
  if (thereSet.has(bundled)) common.push([file, bundled]);
  else gone.push(file);
}
const claimed = new Set(common.map(([, b]) => b));
const added = there.filter((f) => !claimed.has(f));
const renamed = common.filter(([a, b]) => a !== b);

/* --- hooks -------------------------------------------------------------- */

const dropped = [];
for (const [file, bundled] of common) {
  const mine = hooksIn(read(join(SITE, file)) ?? '');
  const theirs = hooksIn(read(join(BUNDLE, bundled)) ?? '');
  const lost = [...mine].filter(([hook, hits]) => (theirs.get(hook)?.length ?? 0) < hits.length);
  if (lost.length) dropped.push({ file, lost });
}

/* --- values ------------------------------------------------------------- */

const loose = [];
for (const file of there) {
  const problems = sentenceValues(read(join(BUNDLE, file)) ?? '');
  if (problems.length) loose.push({ file, problems });
}

/* --- detail ------------------------------------------------------------- */

const crlfHere = here.filter((f) => (read(join(SITE, f)) ?? '').includes('\r\n')).length;
const crlfThere = there.filter((f) => (read(join(BUNDLE, f)) ?? '').includes('\r\n')).length;

const { byHex } = colourTokens();

/** Colours a tree uses that the palette has no name for, and how often. */
function unnamedIn(dir, files) {
  const seen = new Map();
  for (const file of files) {
    for (const hex of (read(join(dir, file)) ?? '').match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      const key = hex.toUpperCase();
      if (!byHex.has(key)) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  return seen;
}

// Against `site/`'s own count, because most of these are not the bundle's
// doing — they are colours the palette has never named, and reporting the
// bundle's total alone would read as a regression it did not cause.
const unnamed = unnamedIn(BUNDLE, there);
const unnamedHere = unnamedIn(SITE, here);
const newlyUnnamed = [...unnamed].filter(([hex]) => !unnamedHere.has(hex));

// The bundle keeps its binaries beside `design/`, not inside it.
const BUNDLE_ASSETS = join(BUNDLE, '..', 'assets');
const missingAssets = new Map();
for (const file of there) {
  for (const asset of assetsIn(read(join(BUNDLE, file)) ?? '')) {
    const anywhere = [SITE, BUNDLE, BUNDLE_ASSETS].some((dir) => existsSync(join(dir, asset)));
    if (anywhere) continue;
    if (!missingAssets.has(asset)) missingAssets.set(asset, []);
    missingAssets.get(asset).push(file);
  }
}

/* --- say ---------------------------------------------------------------- */

const list = (items, indent = '    ', cap = 8) => {
  for (const item of items.slice(0, cap)) console.log(indent + item);
  if (items.length > cap) console.log(indent + '… and ' + (items.length - cap) + ' more');
};

const pages = (n) => `${n} ${n === 1 ? 'page' : 'pages'}`;

console.log('');
console.log(`site/   ${here.length} artboards`);
console.log(`bundle  ${there.length} artboards   ${BUNDLE.replace(ROOT, '')}`);
console.log('');

if (dropped.length) {
  console.log(`!! ${pages(dropped.length)} arrive without wiring they have here.`);
  console.log('   This is not design. Taking the bundle as it stands removes it, and');
  console.log('   every one of these fails quietly.');
  console.log('');
  const byHook = new Map();
  for (const { file, lost } of dropped) {
    for (const [hook, hits] of lost) {
      if (!byHook.has(hook)) byHook.set(hook, []);
      byHook.get(hook).push(`${file}  ${hits.join(' ')}`.trim());
    }
  }
  for (const [hook, why] of HOOKS) {
    const hits = byHook.get(hook);
    if (!hits) continue;
    console.log(`   ${hook.padEnd(17)} ${pages(hits.length)} — ${why}`);
    list(hits, '     ');
  }
  console.log('');
} else {
  console.log('Wiring is intact — every hook site/ has, the bundle has too.');
  console.log('');
}

if (loose.length) {
  console.log(`!! ${pages(loose.length)} send a sentence where a slug belongs.`);
  console.log('   A control that sends its own label sends a different string in each');
  console.log('   edition, so one kind of enquiry lands in three buckets.');
  console.log('');
  for (const { file, problems } of loose) {
    for (const [kind, values] of problems) {
      console.log(`   ${file} — ${kind}`);
      list(values.map((v) => `"${v}"`), '     ', 6);
    }
  }
  console.log('');
}

console.log(`inventory  ${common.length} shared · ${added.length} added · ${gone.length} not in the bundle`);
if (renamed.length) {
  console.log('');
  console.log(`  renamed (${renamed.length}) — each is a live URL, so each needs a redirect`);
  list(renamed.map(([a, b]) => `${a}  →  ${b}`), '    ', 12);
}
if (added.length) {
  console.log('');
  const ko = added.filter((f) => f.endsWith('.KO.dc.html')).length;
  const note = ko ? `, of which ${ko} are Korean twins of pages that have none` : '';
  console.log(`  added (${added.length})${note}`);
  list(added, '    ', 12);
}
if (gone.length) {
  console.log('');
  console.log(`  in site/ but not in the bundle (${gone.length}) — dropped, or renamed in a way this does not know about`);
  list(gone, '    ', 12);
}

console.log('');
console.log('detail');
console.log(`  line endings   site/ ${crlfHere}/${here.length} CRLF · bundle ${crlfThere}/${there.length} CRLF`);
if (crlfThere !== there.length && crlfHere === here.length) {
  console.log('                 Mixing them makes every page read as rewritten, so');
  console.log('                 design:check reports the lot as a structure change.');
}
if (unnamed.size) {
  console.log(`  unnamed colour bundle ${unnamed.size} · site/ ${unnamedHere.size} — most are not the bundle's doing`);
  if (newlyUnnamed.length) {
    console.log(`                 ${newlyUnnamed.length} are new here:`);
    const sorted = newlyUnnamed.sort((a, b) => b[1] - a[1]);
    list(sorted.map(([hex, n]) => `${hex}  ${n}×`), '                 ', 10);
    console.log('                 Name each in src/styles/tokens/colors.css, or map it');
    console.log('                 to the token that already means it.');
  }
}
if (missingAssets.size) {
  console.log(`  missing asset  ${missingAssets.size} named by a page and in neither tree`);
  list([...missingAssets].map(([a, fs]) => `${a}  (${pages(fs.length)})`), '                 ', 10);
}
console.log('');
console.log('Nothing was written.');
console.log('');
