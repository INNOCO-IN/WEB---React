/**
 * Pulls the site's editorial content out of the legacy pages and CSVs.
 *
 *   node scripts/extract-content.mjs
 *
 * Two outputs, from one pass so they can never drift apart:
 *   src/lib/content/*.ts   typed fallback data, bundled with the app
 *   ../seed.sql            the same rows as INSERTs for Supabase
 *
 * The fallback matters: the site has to render its news and workshop cards
 * before the database is populated, and has to keep rendering them if a fetch
 * fails. The database is where this content is *edited*; the bundle is what
 * guarantees a page is never blank.
 *
 * Sources, in order of authority:
 *   site/data/*.csv              the content register — dates, feeds, status
 *   site/News.EN.dc.html         the nine hand-written news cards
 *   site/Workshop.EN.dc.html     workshop cards, accents and audiences
 *   site/ProjectIndexRail.dc.html  project order and rail labels
 *   site/Community.EN.dc.html    community cards
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from './lib/html-to-jsx.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', 'site');
const CONTENT = join(HERE, '..', 'src', 'lib', 'content');

/* -------------------------------------------------------------------- utils */

/** Minimal RFC-4180 reader — the register uses quoted fields with commas. */
function readCsv(file) {
  const text = readFileSync(join(SITE, 'data', file), 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  return body.map((cells) => Object.fromEntries(head.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])));
}

const html = (file) => readFileSync(join(SITE, file), 'utf8');

/** Depth-first walk over a parsed tree. */
function* walk(node) {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}

const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value ?? null;

const hasClass = (node, cls) => (attr(node, 'class') ?? '').split(/\s+/).includes(cls);

/**
 * Named entities the legacy pages actually use.
 *
 * A row is data, not markup: `2016&ndash;2018` has to reach the database as
 * `2016–2018` or every reader of that row has to know to decode it. The
 * numeric forms are handled by the regex below, so this only lists the names.
 */
const ENTITIES = {
  amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ', ne: '≠',
  mdash: '—', ndash: '–', middot: '·',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓',
};

const decode = (value) =>
  value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X'
        ? parseInt(name.slice(2), 16)
        : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name] ?? whole;
  });

/** All text under a node, entities decoded and whitespace collapsed. */
function text(node) {
  let out = '';
  for (const n of walk(node)) if (n.type === 'text') out += n.value;
  return decode(out).replace(/\s+/g, ' ').trim();
}

/** First descendant matching a predicate. */
function find(node, fn) {
  for (const n of walk(node)) if (n !== node && fn(n)) return n;
  return null;
}

function findAll(node, fn) {
  const out = [];
  for (const n of walk(node)) if (n !== node && fn(n)) out.push(n);
  return out;
}

/** `background: #966432` out of a style attribute. */
function background(node) {
  const style = attr(node, 'style') ?? '';
  const m = /background(?:-color)?:\s*([^;]+)/i.exec(style);
  return m ? m[1].trim() : null;
}

/** Hex value → the design-token name it belongs to, when it is one of ours. */
const TOKENS = {
  '#1E8A86': 'teal', '#146560': 'teal-dark', '#E6328C': 'magenta', '#E5188C': 'magenta',
  '#1E648C': 'deepblue', '#46325A': 'plum', '#3C8246': 'green', '#F0D23C': 'yellow',
  '#FAB414': 'amber', '#D21E28': 'red', '#1E5A64': 'slate', '#3C5A46': 'forest',
  '#F05A28': 'orange', '#966432': 'tan', '#F0961E': 'gold', '#DC3C28': 'crimson',
  '#2E3B40': 'ink', '#FAF4E2': 'paper', '#C0392B': 'crimson', '#EEAF05': 'gold',
};

const tokenFor = (hex) => (hex ? TOKENS[hex.toUpperCase()] ?? hex : null);

/** CSV `bg` column names → token names. */
const CSV_BG = { 'deep-blue': 'deepblue', sky: 'deepblue' };

/** Legacy page filename → the app's clean route. */
function routeFor(href) {
  if (!href) return null;
  if (/^https?:/i.test(href)) return href;
  const file = href.replace(/^\.\//, '').split('#')[0];
  const m = /^(.*)\.(EN|KO)\.dc\.html$/.exec(file);
  if (!m) return null;
  const [, name, lang] = m;
  const prefix = lang === 'KO' ? '/ko' : '';
  const explicit = {
    Home: '', 'Are-you-IN': 'connect', 'Community-Index': 'community/all',
    'Story-Index': 'story/all', 'Story-Submission': 'story/submit',
    'Story-This-Is-Us': 'story/this-is-us', 'Action-Research': 'action-research',
  }[name];
  const slug = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let tail = explicit;
  if (tail === undefined) {
    const section = ['Workshop', 'Project', 'Community'].find((s) => name.startsWith(s + '-'));
    tail = section ? `${slug(section)}/${slug(name.slice(section.length + 1))}` : slug(name);
  }
  return tail ? `${prefix}/${tail}` : prefix || '/';
}

/**
 * `12 September 2026 · Seoul, Korea` → { date, place }
 *
 * Formatted from the local date parts, not toISOString(): the parsed date is
 * local midnight, and converting that to UTC moves it a day in either
 * direction depending on the machine's timezone.
 */
function splitDateline(line) {
  const [first, ...rest] = line.split('·').map((s) => s.trim());
  const parsed = Date.parse(first);
  if (Number.isNaN(parsed)) return { date: null, place: rest.join(' · ') || line || null };

  const d = new Date(parsed);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { date: iso, place: rest.join(' · ') || null };
}

/* --------------------------------------------------------------------- news */

/**
 * News rows come from two places: the nine editorial cards written straight
 * into News.EN, and the six register entries that also feed Community and Home.
 */
function extractNews() {
  const rows = [];
  const tree = parse(html('News.EN.dc.html'));

  for (const card of findAll(tree, (n) => n.type === 'element' && hasClass(n, 'cm-card'))) {
    const id = attr(card, 'data-card');
    if (!id) continue;

    const accentBar = card.children.find((c) => c.type === 'element' && background(c));
    const rail = find(card, (n) => n.type === 'element' && (attr(n, 'style') ?? '').includes('writing-mode: vertical-rl'));
    const heading = find(card, (n) => n.tag === 'h3');
    const paragraph = find(card, (n) => n.tag === 'p');

    const dateline = find(card, (n) =>
      n.type === 'element' && n.tag === 'div' && (attr(n, 'style') ?? '').includes('letter-spacing: 0.14em') && text(n));

    const { date, place } = splitDateline(dateline ? text(dateline) : '');

    rows.push({
      id,
      published_at: date,
      feeds: ['news'],
      kind: rail ? text(rail) : null,
      eyebrow: place,
      title: heading ? text(heading) : '',
      body: paragraph ? text(paragraph) : null,
      image: null,
      accent: tokenFor(accentBar ? background(accentBar) : null),
      link: null,
      credit: null,
      credit_href: null,
      status: 'live',
    });
  }

  // The register rows carry feed membership, imagery and credits.
  const register = readCsv('site-news.csv');
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const row of register) {
    const feeds = row.feed.split('|').map((f) => f.trim()).filter(Boolean);
    const existing = byId.get(row.id);
    const shared = {
      published_at: row.date || null,
      feeds,
      eyebrow: row.eyebrow || null,
      title: row.title,
      body: row.body || null,
      image: resolveImage(row.image, `site-news.csv → ${row.id}`),
      accent: CSV_BG[row.bg] ?? row.bg ?? null,
      link: routeFor(row.link),
      credit: row.credit || null,
      credit_href: row.credit_href || null,
      status: row.status === 'live' ? 'live' : 'draft',
    };

    if (existing) Object.assign(existing, shared, { feeds: [...new Set([...existing.feeds, ...feeds])] });
    else rows.push({ id: row.id, kind: null, ...shared });
  }

  // home-latest.csv nominates what the Home page leads with.
  for (const row of readCsv('home-latest.csv')) {
    const hit = rows.find((r) => r.title === row.title);
    if (hit && !hit.feeds.includes('home')) hit.feeds.push('home');
  }

  return rows
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
}

/* ---------------------------------------------------------------- workshops */

/**
 * The workshop wall. Audiences live in the page's filter logic rather than in
 * the markup, so they are read out of that array and zipped onto the cards in
 * source order — which is exactly how the legacy filter matched them.
 */
function extractWorkshops() {
  const source = html('Workshop.EN.dc.html');
  const tree = parse(source);

  const audienceMatch = /const audience = \[([^\]]*)\]/.exec(source);
  const audiences = audienceMatch
    ? audienceMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    : [];

  const rows = [];

  // The signature workshop sits above the wall in its own full-bleed block.
  const featured = find(tree, (n) => n.tag === 'a' && (attr(n, 'href') ?? '').includes('Mobius-Making'));
  if (featured) {
    // The copy panel is the one painted with `background-color`; the paper
    // "Signature · Start here" badge uses the `background` shorthand.
    const panel = find(featured, (n) =>
      n.type === 'element' && /background-color:/i.test(attr(n, 'style') ?? ''));
    rows.push({
      slug: 'mobius-making',
      title: text(find(featured, (n) => n.tag === 'h2') ?? { children: [] }) || 'Möbius Making',
      eyebrow: 'The signature workshop · For All',
      blurb: text(find(featured, (n) => n.tag === 'p') ?? { children: [] }),
      audience: 'For All',
      duration: '3 hrs · extendable',
      accent: tokenFor(panel ? background(panel) : '#EEAF05'),
      ink: 'paper',
      route: routeFor('Workshop-Mobius-Making.EN.dc.html'),
      featured: true,
      cta: 'Explore',
      sort_order: 0,
      active: true,
    });
  }

  const cards = findAll(tree, (n) => n.tag === 'a' && hasClass(n, 'ws-card') && find(n, (c) => c.tag === 'h3'));

  cards.forEach((card, i) => {
    const href = attr(card, 'href') ?? '';
    const panel = card.children.find((c) => c.type === 'element' && background(c)) ?? card;
    const rail = find(card, (n) => n.type === 'element' && (attr(n, 'style') ?? '').includes('writing-mode: vertical-rl'));
    const heading = find(card, (n) => n.tag === 'h3');
    const paragraph = find(card, (n) => n.tag === 'p');
    const cta = findAll(card, (n) => n.tag === 'span' && /^(Explore|Register)$/.test(text(n))).pop();

    const slug = /Workshop-(.*)\.EN\.dc\.html/.exec(href)?.[1]?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? null;
    if (!slug) return;

    const panelStyle = attr(panel, 'style') ?? '';
    const inkIsPaper = /color:\s*#FAF4E2/i.test(panelStyle);

    rows.push({
      slug,
      title: heading ? text(heading) : '',
      eyebrow: rail ? text(rail) : null,
      blurb: paragraph ? text(paragraph) : null,
      audience: audiences[i] ?? null,
      duration: null,
      accent: tokenFor(background(panel)),
      ink: inkIsPaper ? 'paper' : 'ink',
      route: routeFor(href),
      featured: false,
      cta: cta ? text(cta) : 'Explore',
      sort_order: i + 1,
      active: true,
    });
  });

  return rows;
}

/* ----------------------------------------------------------------- projects */

/**
 * Order and rail labels from the shared rail; copy and imagery from the
 * register; Korean copy from the KO index page.
 *
 * The rail names eight projects and the site has thirteen project pages, so a
 * register row the rail does not list is appended rather than dropped — that
 * is how the five pages nothing ever linked to (BridgeBuilder Program, CTN,
 * GYEM, I Grow Seed, tasmena) reach the table, and from there every rail and
 * the index wall. Those rows carry their own `meta`, because a rail label is a
 * shorter line than a card eyebrow.
 */
function extractProjects() {
  const rail = html('ProjectIndexRail.dc.html');
  const block = /return \[([\s\S]*?)\];/.exec(rail)?.[1] ?? '';
  const ko = koCopy('Project.KO.dc.html', (n) => n.tag === 'article');

  const rows = [];
  const re = /\{\s*slug:\s*'([^']*)',\s*title:\s*'([^']*)',\s*meta:\s*'([^']*)',\s*href:\s*'([^']*)'/g;
  let m;
  let order = 0;
  while ((m = re.exec(block))) {
    const [, slug, title, meta, href] = m;
    rows.push({
      slug,
      title: title.replace(/\'/g, "'"),
      title_ko: null,
      meta,
      eyebrow: null,
      eyebrow_ko: null,
      body: null,
      body_ko: null,
      image: null,
      accent: 'slate',
      route: routeFor(href),
      started_on: null,
      featured: false,
      sort_order: ++order,
      status: 'live',
    });
  }

  for (const row of readCsv('project.csv')) {
    const route = routeFor(row.link);
    const hit = rows.find((r) => r.route === route);
    // The KO index page has no rail, so a Korean `meta` would have no reader.
    const korean = ko.get(route);
    const shared = {
      eyebrow: row.eyebrow || null,
      eyebrow_ko: korean?.label ?? null,
      body: row.body || null,
      body_ko: korean?.body ?? null,
      image: resolveImage(row.image, `project.csv → ${row.id}`),
      accent: CSV_BG[row.bg] ?? row.bg ?? 'slate',
      started_on: row.date || null,
      featured: row.featured === 'yes',
      status: row.status === 'live' ? 'live' : 'draft',
    };
    // The rail's label wins unless the register states one, which is how the
    // five projects the rail never listed get a short line of their own.
    if (hit) {
      Object.assign(hit, shared, { title_ko: korean?.title ?? null }, row.meta ? { meta: row.meta } : {});
    } else if (route) {
      rows.push({
        slug: route.split('/').pop(),
        title: row.title,
        title_ko: korean?.title ?? null,
        meta: row.meta || row.eyebrow || null,
        ...shared,
        route,
        sort_order: ++order,
      });
    }
  }

  return rows;
}

/* -------------------------------------------------------------- communities */

/**
 * The four pieces of copy a legacy card carries, named for where they sit.
 *
 * Every card on the project index, the community grid and their Korean twins
 * is laid out the same way: a rail label turned on its side, a small tracked
 * line above the title, the title, and one paragraph. Both small lines are
 * uppercase and tracked out, so they are told apart by `writing-mode` rather
 * than by size.
 *
 * They are `kind` and `label` here rather than `eyebrow` and `meta`, because
 * the two walls use them for opposite purposes: a community card's sideways
 * word is its eyebrow ('Community') and its tracked line says where the circle
 * stands, while a project card's sideways word is a constant the component
 * draws and the tracked line is the project's eyebrow. Naming them by position
 * lets each extractor say which is which.
 */
function cardCopy(card) {
  const tracked = (vertical) =>
    find(card, (n) => {
      if (n.type !== 'element') return false;
      const style = attr(n, 'style') ?? '';
      if (!/letter-spacing:\s*0\.(14|2)em/.test(style)) return false;
      return /writing-mode/.test(style) === vertical && Boolean(text(n));
    });

  const heading = find(card, (n) => n.tag === 'h3' || n.tag === 'h2');
  const paragraph = find(card, (n) => n.tag === 'p');
  const kind = tracked(true);
  const label = tracked(false);

  return {
    title: heading ? text(heading) : null,
    kind: kind ? text(kind) : null,
    label: label ? text(label) : null,
    body: paragraph ? text(paragraph) : null,
  };
}

/** A title into a slug: 'I Grow Seeds — KULNA' → 'i-grow-seeds-kulna'. */
const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The card's own link: the small round arrow at its foot. */
function cardRoute(card) {
  const link = findAll(card, (n) => {
    const href = attr(n, 'href') ?? '';
    return n.tag === 'a' && /^(Community|Project)-/.test(href);
  })[0];
  return link ? routeFor(attr(link, 'href')) : null;
}

/**
 * Korean copy from a KO page, keyed by the route each card links to.
 *
 * The KO pages are not translations of a data source — they are the same
 * layout with Korean copy written into the markup. So when a wall becomes
 * data, that copy has to be read out and put on the row, or /ko/project and
 * /ko/community would quietly start rendering English. Matched by route,
 * because a slug appears nowhere in the markup.
 */
function koCopy(file, isCard) {
  const tree = parse(html(file));
  const out = new Map();

  for (const card of findAll(tree, (n) => n.type === 'element' && isCard(n))) {
    const route = cardRoute(card);
    if (!route || out.has(route)) continue;

    const copy = cardCopy(card);
    if (!copy.title) continue;

    out.set(route, copy);
  }
  return out;
}

/**
 * The community index cards — one per circle of the network.
 *
 * Community.EN mixes two kinds of card in the same `.cm-card` class: the
 * circles themselves, and the six register news items. The news ones carry a
 * `data-card` id and are handled by extractNews, so they are skipped here.
 *
 * A circle's route is not always a community page. Two of them — the Asia
 * Exchange community and I Grow Seeds — point at the project that created
 * them, which is the distinction the index page draws: the project is the
 * intervention, the community is what remains. Reading only `Community-`
 * links dropped exactly those two, so the grid rendered seven circles where
 * the page has nine.
 */
function extractCommunities() {
  const tree = parse(html('Community.EN.dc.html'));
  const ko = koCopy('Community.KO.dc.html', (n) => hasClass(n, 'cm-card') && !attr(n, 'data-card'));
  const rows = [];
  const seen = new Set();
  let order = 0;

  for (const card of findAll(tree, (n) => n.type === 'element' && hasClass(n, 'cm-card'))) {
    if (attr(card, 'data-card')) continue;

    const route = cardRoute(card);
    const copy = cardCopy(card);
    if (!route || !copy.title || seen.has(route)) continue;
    seen.add(route);

    const image = find(card, (n) => n.tag === 'img');
    const accentNode = findAll(card, (n) =>
      n.type === 'element' && n.tag === 'span' && /border-radius:\s*50%/.test(attr(n, 'style') ?? ''))[0];
    const korean = ko.get(route) ?? {};

    rows.push({
      // A circle that points at a project cannot borrow that project's slug —
      // `food-revolution` is the project, the circle it left behind is
      // I Grow Seeds — so those are named after the circle instead.
      slug: route.startsWith('/community/') ? route.split('/').pop() : slugify(copy.title),
      title: copy.title,
      title_ko: korean.title ?? null,
      meta: copy.label,
      meta_ko: korean.label ?? null,
      eyebrow: copy.kind,
      eyebrow_ko: korean.kind ?? null,
      body: copy.body,
      body_ko: korean.body ?? null,
      image: image ? resolveImage(attr(image, 'src'), `Community.EN → ${route}`) : null,
      accent: tokenFor(accentNode ? background(accentNode) : null) ?? 'teal',
      route,
      sort_order: ++order,
      status: 'live',
    });
  }

  return rows;
}

/**
 * A page-relative image path → the path the app serves it at, checked on disk.
 *
 * The content register carries a few stale paths — `Nepal_Storytelling.jpg`
 * for what is really `community-img/nepal-storytelling.jpg`, and one file that
 * was never added at all. On the old site those rendered as broken images, so
 * a missing file is matched by filename first, and only nulled if it genuinely
 * is not there. A null image is not a hole: the card falls back to its colour
 * bar, which is the design's own alternative.
 */
/** Filenames differ from the register by case and by _ vs - . Fold both. */
const normaliseName = (name) => name.toLowerCase().replace(/[_\s]+/g, '-');

const IMAGE_INDEX = (() => {
  const index = new Map();
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(join(SITE, dir), { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else index.set(normaliseName(entry.name), `/${prefix}${entry.name}`);
    }
  };
  for (const dir of ['community-img', 'project-img', 'story-img', 'story-photos', 'team', 'workshop-img']) {
    if (existsSync(join(SITE, dir))) walk(dir, `${dir}/`);
  }
  return index;
})();

const missingImages = [];

function resolveImage(src, owner = '') {
  if (!src) return null;
  if (/^(https?:|data:)/i.test(src)) return src;

  const path = '/' + src.replace(/^\.\//, '').replace(/^\//, '');
  if (existsSync(join(SITE, path))) return path;

  // Try the filename on its own — the register sometimes drops the directory
  // or capitalises differently from the file on disk.
  const byName = IMAGE_INDEX.get(normaliseName(path.split('/').pop()));
  if (byName) return byName;

  missingImages.push({ src, owner });
  return null;
}

/* ------------------------------------------------------------------- output */

const news = extractNews();
const workshops = extractWorkshops();
const projects = extractProjects();
const communities = extractCommunities();

mkdirSync(CONTENT, { recursive: true });

function writeTs(file, name, type, rows) {
  const banner = `// Generated by scripts/extract-content.mjs — do not edit by hand.
// Bundled fallback for the ${name} table: what the site renders before the
// database is seeded, and if a query fails. Edit the rows in Supabase.
`;
  writeFileSync(
    join(CONTENT, file),
    `${banner}import type { ${type} } from './types';\n\nexport const ${name}: ${type}[] = ${JSON.stringify(rows, null, 2)};\n`,
  );
}

writeTs('news.ts', 'news', 'NewsItem', news);
writeTs('workshops.ts', 'workshops', 'WorkshopCard', workshops);
writeTs('projects.ts', 'projects', 'ProjectCard', projects);
writeTs('communities.ts', 'communities', 'CommunityCard', communities);

/* --------------------------------------------------------------- seed SQL */

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (v) => (v?.length ? `array[${v.map(q).join(', ')}]` : `'{}'`);
const bool = (v) => (v ? 'true' : 'false');
const num = (v) => (v === null || v === undefined ? '0' : String(v));

const seed = `-- IN Website — content seed
-- Generated by app/scripts/extract-content.mjs from site/data/*.csv and the
-- legacy pages. Run schema.sql first, then paste this into Supabase → SQL
-- Editor. Safe to re-run: every insert is an upsert on the primary key.

-- ========== news ==========
insert into public.news
  (id, published_at, feeds, kind, eyebrow, title, body, image, accent, link, credit, credit_href, status)
values
${news.map((n) => `  (${q(n.id)}, ${q(n.published_at)}, ${arr(n.feeds)}, ${q(n.kind)}, ${q(n.eyebrow)}, ${q(n.title)}, ${q(n.body)}, ${q(n.image)}, ${q(n.accent)}, ${q(n.link)}, ${q(n.credit)}, ${q(n.credit_href)}, ${q(n.status)})`).join(',\n')}
on conflict (id) do update set
  published_at = excluded.published_at, feeds = excluded.feeds, kind = excluded.kind,
  eyebrow = excluded.eyebrow, title = excluded.title, body = excluded.body,
  image = excluded.image, accent = excluded.accent, link = excluded.link,
  credit = excluded.credit, credit_href = excluded.credit_href, status = excluded.status;

-- ========== workshops ==========
insert into public.workshops
  (slug, title, eyebrow, blurb, audience, duration, accent, ink, route, featured, cta, sort_order, active)
values
${workshops.map((w) => `  (${q(w.slug)}, ${q(w.title)}, ${q(w.eyebrow)}, ${q(w.blurb)}, ${q(w.audience)}, ${q(w.duration)}, ${q(w.accent)}, ${q(w.ink)}, ${q(w.route)}, ${bool(w.featured)}, ${q(w.cta)}, ${num(w.sort_order)}, ${bool(w.active)})`).join(',\n')}
on conflict (slug) do update set
  title = excluded.title, eyebrow = excluded.eyebrow, blurb = excluded.blurb,
  audience = excluded.audience, duration = excluded.duration, accent = excluded.accent,
  ink = excluded.ink, route = excluded.route, featured = excluded.featured,
  cta = excluded.cta, sort_order = excluded.sort_order, active = excluded.active;

-- ========== projects ==========
insert into public.projects
  (slug, title, title_ko, meta, eyebrow, eyebrow_ko, body, body_ko, image, accent, route, started_on, featured, sort_order, status)
values
${projects.map((p) => `  (${q(p.slug)}, ${q(p.title)}, ${q(p.title_ko)}, ${q(p.meta)}, ${q(p.eyebrow)}, ${q(p.eyebrow_ko)}, ${q(p.body)}, ${q(p.body_ko)}, ${q(p.image)}, ${q(p.accent)}, ${q(p.route)}, ${q(p.started_on)}, ${bool(p.featured)}, ${num(p.sort_order)}, ${q(p.status)})`).join(',\n')}
on conflict (slug) do update set
  title = excluded.title, title_ko = excluded.title_ko, meta = excluded.meta,
  eyebrow = excluded.eyebrow, eyebrow_ko = excluded.eyebrow_ko,
  body = excluded.body, body_ko = excluded.body_ko,
  image = excluded.image, accent = excluded.accent,
  route = excluded.route, started_on = excluded.started_on,
  featured = excluded.featured, sort_order = excluded.sort_order,
  status = excluded.status;

-- ========== communities ==========
insert into public.communities
  (slug, title, title_ko, meta, meta_ko, eyebrow, eyebrow_ko, body, body_ko, image, accent, route, sort_order, status)
values
${communities.map((c) => `  (${q(c.slug)}, ${q(c.title)}, ${q(c.title_ko)}, ${q(c.meta)}, ${q(c.meta_ko)}, ${q(c.eyebrow)}, ${q(c.eyebrow_ko)}, ${q(c.body)}, ${q(c.body_ko)}, ${q(c.image)}, ${q(c.accent)}, ${q(c.route)}, ${num(c.sort_order)}, ${q(c.status)})`).join(',\n')}
on conflict (slug) do update set
  title = excluded.title, title_ko = excluded.title_ko,
  meta = excluded.meta, meta_ko = excluded.meta_ko,
  eyebrow = excluded.eyebrow, eyebrow_ko = excluded.eyebrow_ko,
  body = excluded.body, body_ko = excluded.body_ko,
  image = excluded.image, accent = excluded.accent, route = excluded.route,
  sort_order = excluded.sort_order, status = excluded.status;
`;

writeFileSync(join(HERE, '..', '..', 'seed.sql'), seed);

if (missingImages.length) {
  console.log('');
  console.log('!! image paths in the register that do not exist on disk:');
  for (const m of missingImages) console.log(`   ${m.src}  (${m.owner})`);
  console.log('   → these rows fall back to their colour bar.');
  console.log('');
}

console.log(`news:        ${news.length}`);
console.log(`workshops:   ${workshops.length}`);
console.log(`projects:    ${projects.length}`);
console.log(`communities: ${communities.length}`);
