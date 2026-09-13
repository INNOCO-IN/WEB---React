/**
 * Pulls the data out of the legacy pages' DCLogic scripts.
 *
 *   node scripts/extract-page-data.mjs
 *
 * Two lists live inside page scripts rather than in the markup or the content
 * register, so the page converter cannot see them:
 *
 *   galleries.ts          the project pages' lightbox photos
 *   collectives.ts        the IN-Collective roster and its long-form bios
 *   ../seed-collectives.sql   the same roster as upserts, for Supabase
 *
 * The roster is written twice on purpose, and in one pass, so the bundled
 * copy and the table can never disagree — the same rule the other two
 * extractors follow.
 *
 * Extracted rather than transcribed. The captions are alt text and the bios
 * are people's own words about themselves — retyping either by hand is how
 * they quietly go wrong.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentName } from './lib/routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', 'site');
const CONTENT = join(HERE, '..', 'src', 'lib', 'content');
const ROOT = join(HERE, '..', '..');

/* -------------------------------------------------------------- galleries */

/** Reads one `{ src: …, cap: …, pos: … }` list out of a page's script. */
function photosIn(html) {
  const block = /photos\(\)\s*\{\s*return \[([\s\S]*?)\];/.exec(html);
  if (!block) return null;

  const photos = [];
  const re = /\{\s*src:\s*(['"])(.*?)\1\s*,\s*cap:\s*(['"])((?:\\.|(?!\3).)*)\3\s*(?:,\s*pos:\s*(['"])(.*?)\5\s*)?\}/g;
  let m;
  while ((m = re.exec(block[1]))) {
    photos.push({
      src: '/' + m[2].replace(/^\//, ''),
      alt: unquote(m[4]),
      position: m[6] ?? null,
    });
  }
  return photos.length ? photos : null;
}

/* ------------------------------------------------------------- collectives */

/**
 * The roster is an array-of-arrays: [num, name, photo, oneLiner, fullBio].
 * The photo slot is sometimes the shared BLANK data-URI constant rather than
 * a path; that constant is inlined here so the field is always a usable src.
 */
const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/**
 * The same roster, read off the page instead of out of its script.
 *
 * The 2026 design writes each person out as their own `<article>` rather than
 * looping one card over a list in the page's DCLogic. That is where the roster
 * now lives, so that is where it is read from — and having read it, `site/`'s
 * page goes back to looping, because eighteen people written into the markup is
 * a roster that needs a deploy to change and that disagrees with the table the
 * moment anybody edits either one.
 *
 * Matched on the shape rather than on the styles: a card is an `<article>` with
 * a `tm-photo` in it, its number is the `#NN`, and its two paragraphs are the
 * one-liner and the bio, in that order.
 */
function rosterInMarkup(html) {
  const rows = [];
  for (const card of html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)) {
    const body = card[1];
    const photo = /<img class="tm-photo" src="([^"]*)" alt="([^"]*)"/.exec(body);
    const num = /># *(\d+)</.exec(body);
    if (!photo || !num) continue;

    const texts = [...body.matchAll(/<(div|p)[^>]*>([^<]+)<\/\1>/g)].map((m) => decode(m[2].trim()));
    // #NN, name, role, one-liner, bio — the role is optional, and the bio only
    // exists once somebody has written one.
    const after = texts.slice(texts.findIndex((t) => t === '#' + num[1]) + 1);
    const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
      decode(m[1].replace(/<[^>]+>/g, '').trim()),
    );

    rows.push({
      num: num[1],
      name: decode(photo[2]),
      photo: '/' + photo[1].replace(/^\//, ''),
      oneLiner: paras[0] ?? '',
      fullBio: paras[1] ?? '',
      role: after[1] && after[1] !== paras[0] ? after[1] : null,
    });
  }
  rows.sort((a, b) => a.num.localeCompare(b.num));
  return rows.length ? rows : null;
}

/** `&amp;` and friends — the markup's entities, which the data should not carry. */
function decode(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function rosterIn(html) {
  const block = /const data = \[([\s\S]*?)\n    \];/.exec(html);
  if (!block) return null;

  const rows = [];
  const re = /\[\s*'(\d+)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*(BLANK|'(?:\\.|[^'])*')\s*,\s*'((?:\\.|[^'])*)'\s*,\s*"((?:\\.|[^"])*)"\s*\]/g;
  let m;
  while ((m = re.exec(block[1]))) {
    // BLANK is a 1×1 transparent GIF the source uses where no portrait exists.
    // Kept verbatim: an empty src would make the browser re-request the page.
    const photo = m[3] === 'BLANK' ? BLANK_GIF : '/' + unquote(m[3].slice(1, -1)).replace(/^\//, '');
    rows.push({
      num: m[1],
      name: unquote(m[2]),
      photo,
      oneLiner: unquote(m[4]),
      fullBio: unquote(m[5]),
    });
  }

  // Roles are keyed by number in a lookup beside the data.
  const roleBlock = /const roleMap = \{([^}]*)\}/.exec(html);
  const roles = {};
  if (roleBlock) {
    for (const r of roleBlock[1].matchAll(/'(\d+)':\s*'((?:\\.|[^'])*)'/g)) {
      roles[r[1]] = unquote(r[2]);
    }
  }
  for (const row of rows) row.role = roles[row.num] ?? null;

  return rows.length ? rows : null;
}

/** Resolves the JS escapes inside a quoted literal's body. */
function unquote(body) {
  return JSON.parse(`"${body.replace(/\\'/g, "'").replace(/(?<!\\)"/g, '\\"')}"`);
}

/* ------------------------------------------------------------------ output */

const galleries = {};
let roster = null;

for (const file of readdirSync(SITE).sort()) {
  if (!file.endsWith('.dc.html')) continue;
  const html = readFileSync(join(SITE, file), 'utf8');

  const photos = photosIn(html);
  if (photos) galleries[componentName(file)] = photos;

  // Collectives became People in the 2026 design. Either page can carry the
  // roster either way — as the `const data` its script has always held, or as
  // the eighteen `<article>`s the design bundle wrote it out as — so both are
  // tried, script first. A page that has been put back on a loop has only the
  // script, and a bundle fresh from the design tool has only the markup.
  if (!roster && (file.startsWith('Collectives.') || file === 'People.EN.dc.html')) {
    roster = rosterIn(html) ?? rosterInMarkup(html);
  }
}

// The Korean page is the same roster in the other language. Until now there was
// no Korean page to read, so every Korean field was null and `inLang` fell back
// to English for all of them; the bios exist now, and a bio nobody transcribed
// is a bio that cannot go wrong.
const koreanPage = join(SITE, 'People.KO.dc.html');
if (roster && existsSync(koreanPage)) {
  const koreanHtml = readFileSync(koreanPage, 'utf8');
  const korean = rosterIn(koreanHtml) ?? rosterInMarkup(koreanHtml) ?? [];
  const byNum = new Map(korean.map((person) => [person.num, person]));
  // A field only counts as translated when it says something different. Several
  // of the Korean bios are still the English ones, and storing those would make
  // an untranslated field indistinguishable from a translated one — `inLang`
  // would stop falling back, and nothing would be able to list what is left to
  // write.
  const translated = (ko, en) => (ko && ko !== en ? ko : null);
  for (const person of roster) {
    const ko = byNum.get(person.num);
    if (!ko) continue;
    person.nameKo = translated(ko.name, person.name);
    person.roleKo = translated(ko.role, person.role);
    person.oneLinerKo = translated(ko.oneLiner, person.oneLiner);
    person.fullBioKo = translated(ko.fullBio, person.fullBio);
  }
}

writeFileSync(
  join(CONTENT, 'galleries.ts'),
  `// Generated by scripts/extract-page-data.mjs — do not edit by hand.

/** One photo in a project page's lightbox. */
export interface GalleryPhoto {
  src: string;
  /** Caption, which doubles as the alt text — they say the same thing here. */
  alt: string;
  /** background-position for the large frame, when centring crops badly. */
  position: string | null;
}

/** Page component name → its photos, in the order the page shows them. */
export const GALLERIES: Record<string, GalleryPhoto[]> = ${JSON.stringify(galleries, null, 2)};
`,
);

writeFileSync(
  join(CONTENT, 'collectives.ts'),
  `// Generated by scripts/extract-page-data.mjs — do not edit by hand.

/** One member of the IN-Collective roster. */
export interface Collective {
  /** Their number in the collective, '01' upward — also their sort key. */
  num: string;
  name: string;
  /** A 1x1 transparent GIF where no portrait exists yet. */
  photo: string;
  oneLiner: string;
  fullBio: string;
  role: string | null;
  /**
   * Korean copy, absent until someone writes it — see \`inLang\`. The bundled
   * roster never carries it: it is extracted from the English page.
   */
  nameKo?: string | null;
  oneLinerKo?: string | null;
  fullBioKo?: string | null;
  roleKo?: string | null;
  nameZhTw?: string | null;
  oneLinerZhTw?: string | null;
  fullBioZhTw?: string | null;
  roleZhTw?: string | null;
}

/**
 * The 1x1 transparent GIF used where no portrait exists yet.
 *
 * A real src rather than an empty one: an empty \`src\` makes the browser
 * re-request the page itself, which is a second full download per missing
 * portrait.
 */
export const BLANK_PORTRAIT = '${BLANK_GIF}';

export const ROSTER: Collective[] = ${JSON.stringify(roster ?? [], null, 2)};
`,
);

/* ------------------------------------------------- seed SQL for collectives */

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

writeFileSync(
  join(ROOT, 'seed-collectives.sql'),
  `-- IN Website — IN-Collective roster seed
-- Generated by app/scripts/extract-page-data.mjs from site/People.*.dc.html.
-- Run schema.sql first, then paste this into Supabase → SQL Editor.
-- Safe to re-run: every insert is an upsert on \`num\`.

insert into public.collectives
  (num, name, photo, one_liner, full_bio, role, status)
values
${(roster ?? [])
  .map((p) => `  (${q(p.num)}, ${q(p.name)}, ${q(p.photo)}, ${q(p.oneLiner)}, ${q(p.fullBio)}, ${q(p.role)}, 'live')`)
  .join(',\n')}
on conflict (num) do update set
  name = excluded.name, photo = excluded.photo, one_liner = excluded.one_liner,
  full_bio = excluded.full_bio, role = excluded.role, status = excluded.status;
`,
);

for (const [name, photos] of Object.entries(galleries)) console.log(`${name}: ${photos.length} photos`);
console.log(`roster: ${roster?.length ?? 0} people → collectives.ts + seed-collectives.sql`);
