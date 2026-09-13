/**
 * Design → code, for a site whose structure is already built.
 *
 * `convert-pages.mjs` regenerates everything a page is: its component, its
 * stylesheet, its route, and its words. That is the right tool when `site/` is
 * the design and the React page is its output. It is the wrong tool once the
 * components have been worked on by hand, because a content edit in the design
 * then arrives carrying a component rewrite nobody asked for.
 *
 * This runs the same converter and then decides what to keep.
 *
 *   node scripts/design-sync.mjs            report only — nothing is written
 *   node scripts/design-sync.mjs --words    take the words, keep every component
 *   node scripts/design-sync.mjs --apply    take everything (what convert-pages does)
 *
 * The report is the point. A design edit is one of three things, and they are
 * not interchangeable:
 *
 *   words only   the sentence changed. Safe: `--words` takes it.
 *   structural   a block moved, was added, or was removed. The component has
 *                to change, so this is a decision, not a sync.
 *   drifted      the words changed in a way that renumbers the keys, which
 *                silently invalidates the hand-written Chinese. Reported by
 *                name, because nothing else will notice.
 *
 * The third is the one worth having a tool for. Keys are positional
 * (`000_div`, `001_h1`, …), so inserting a paragraph in the design shifts every
 * key after it — and `zh-TW/pages/*.json`, which is written by hand and which
 * the converter deliberately never overwrites, keeps answering to the old
 * numbers. The page still renders. It renders the wrong sentences.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC = join(HERE, '..', 'src');
const CONVERTER = join(HERE, 'convert-pages.mjs');

/** What a page *is* — regenerating these is a rewrite of work done by hand. */
const STRUCTURE = [
  join(SRC, 'pages'),
  join(SRC, 'logic'),
  join(SRC, 'lib', 'route-map.ts'),
];

/** What a page *says* — the half a design edit is normally about. */
const CONTENT = [
  join(SRC, 'i18n', 'resources', 'en', 'pages'),
  join(SRC, 'i18n', 'resources', 'ko', 'pages'),
  join(SRC, 'i18n', 'resources', 'pages.ts'),
];

/** The locale written by hand, which the converter creates empty and never touches. */
const HAND_TRANSLATED = join(SRC, 'i18n', 'resources', 'zh-TW', 'pages');

const mode = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--words')
    ? 'words'
    : 'report';

/* ------------------------------------------------------------------ files */

/** Every file under a path, whether it names a directory or a single file. */
function walk(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    walk(join(path, e.name)),
  );
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** Copies a path into the backup, preserving its position under src/. */
function stash(backup, path) {
  if (!existsSync(path)) return;
  cpSync(path, join(backup, relative(SRC, path)), { recursive: true });
}

/** Puts a stashed path back, discarding whatever the converter wrote. */
function restore(backup, path) {
  const saved = join(backup, relative(SRC, path));
  if (!existsSync(saved)) return;
  rmSync(path, { recursive: true, force: true });
  cpSync(saved, path, { recursive: true });
}

/* ---------------------------------------------------------------- reading */

/** One namespace's words, or null when the file is absent or unreadable. */
function words(path) {
  const raw = read(path);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function namespaces(dir) {
  return walk(dir)
    .filter((p) => p.endsWith('.json'))
    .map((p) => basename(p, '.json'));
}

/* ------------------------------------------------------------------- main */

const backup = mkdtempSync(join(tmpdir(), 'design-sync-'));
for (const path of [...STRUCTURE, ...CONTENT]) stash(backup, path);

let converterOutput = '';
try {
  converterOutput = execFileSync(process.execPath, [CONVERTER], { encoding: 'utf8' });
} catch (err) {
  for (const path of [...STRUCTURE, ...CONTENT]) restore(backup, path);
  rmSync(backup, { recursive: true, force: true });
  console.error('The converter failed; nothing was changed.\n');
  console.error(err.stdout ?? err.message);
  process.exit(1);
}

/* --- what moved -------------------------------------------------------- */

const changed = { structure: [], content: [] };
for (const [kind, paths] of [['structure', STRUCTURE], ['content', CONTENT]]) {
  for (const path of paths) {
    for (const file of walk(path)) {
      const before = read(join(backup, relative(SRC, file)));
      if (before !== read(file)) changed[kind].push(relative(SRC, file));
    }
  }
}

/* --- what the Chinese no longer answers to ----------------------------- */

const stale = [];
for (const ns of namespaces(join(SRC, 'i18n', 'resources', 'en', 'pages'))) {
  const hand = words(join(HAND_TRANSLATED, `${ns}.json`));
  if (!hand || !Object.keys(hand).length) continue;

  const was = words(join(backup, 'i18n', 'resources', 'en', 'pages', `${ns}.json`)) ?? {};
  const now = words(join(SRC, 'i18n', 'resources', 'en', 'pages', `${ns}.json`)) ?? {};

  // A key the Chinese answers whose English has moved on. The translation is
  // still there and still renders — it just no longer says what the page says.
  const moved = Object.keys(hand).filter((k) => k in was && was[k] !== now[k]);
  // A key the Chinese answers that the page no longer has at all.
  const orphaned = Object.keys(hand).filter((k) => !(k in now));
  // A key the page has that the Chinese has never been given.
  const missing = Object.keys(now).filter((k) => !(k in hand));

  if (moved.length || orphaned.length || missing.length) {
    stale.push({ ns, moved, orphaned, missing });
  }
}

/* --- decide ------------------------------------------------------------ */

if (mode === 'report') {
  for (const path of [...STRUCTURE, ...CONTENT]) restore(backup, path);
} else if (mode === 'words') {
  for (const path of STRUCTURE) restore(backup, path);
}
rmSync(backup, { recursive: true, force: true });

/* --- say ---------------------------------------------------------------- */

const line = (n, one, many) => `${n} ${n === 1 ? one : many}`;

console.log('');
if (!changed.structure.length && !changed.content.length) {
  console.log('site/ and the app agree — nothing to sync.');
} else {
  console.log(`words     ${line(changed.content.length, 'file', 'files')} would change`);
  for (const f of changed.content.slice(0, 12)) console.log(`            ${f}`);
  if (changed.content.length > 12) console.log(`            … and ${changed.content.length - 12} more`);

  console.log(`structure ${line(changed.structure.length, 'file', 'files')} would change`);
  for (const f of changed.structure.slice(0, 12)) console.log(`            ${f}`);
  if (changed.structure.length > 12) console.log(`            … and ${changed.structure.length - 12} more`);

  if (changed.structure.length) {
    console.log('');
    console.log('  Structure changed, so this is not only a content update. Either the');
    console.log('  design moved something, or these components have been edited by hand');
    console.log('  since they were generated. Look before you --apply.');
  }
}

if (stale.length) {
  console.log('');
  console.log('!! Traditional Chinese is hand-written and was not regenerated.');
  console.log('   These pages now answer to keys that have moved:');
  for (const s of stale) {
    const parts = [
      s.moved.length ? `${s.moved.length} stale` : null,
      s.orphaned.length ? `${s.orphaned.length} orphaned` : null,
      s.missing.length ? `${s.missing.length} untranslated` : null,
    ].filter(Boolean);
    console.log(`   ${s.ns.padEnd(26)} ${parts.join(', ')}`);
    for (const k of s.moved.slice(0, 3)) console.log(`     ${k} — the English changed under it`);
  }
  console.log('   Edit src/i18n/resources/zh-TW/pages/<page>.json to match.');
}

console.log('');
console.log(
  mode === 'report'
    ? 'Reported only — nothing was written. --words takes the words, --apply takes everything.'
    : mode === 'words'
      ? 'Words written. Every component was left exactly as it was.'
      : 'Everything written, the same as running convert-pages.mjs.',
);
console.log('');

// The converter's own findings — unnamed colours, malformed markup, conflict
// markers — are about `site/`, and are worth seeing whatever mode this ran in.
const findings = converterOutput.split('\n').filter((l) => l.startsWith('!!'));
if (findings.length) {
  console.log('From the converter:');
  for (const f of findings) console.log(`  ${f}`);
  console.log('');
}
