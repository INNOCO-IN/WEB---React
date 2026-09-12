/**
 * Converts the static site in ../site into React page components.
 *
 *   node scripts/convert-pages.mjs
 *
 * Emits, under src/:
 *   pages/<Name>.tsx     one component per page, wrapped in <SiteLayout>
 *   pages/<Name>.css     that page's own <style> block, scoped to the page
 *   pages/registry.ts    route path → lazy component
 *   lib/route-map.ts     legacy *.dc.html filename → clean route
 *
 * Re-runnable: it overwrites its own output and touches nothing else, so the
 * hand-written parts of the app (layout, data layer, logic hooks) survive a
 * re-run when a legacy page changes.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, toJsx } from './lib/html-to-jsx.mjs';
import {
  NON_ROUTES, ALIASES, TAKEN_OVER, TEMPLATES, routesForTemplate,
  parseFile, componentName, routeFor,
} from './lib/routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', 'site');
const SRC = join(HERE, '..', 'src');
const PAGES = join(SRC, 'pages');

/* ------------------------------------------------------------------- setup */

const files = readdirSync(SITE)
  .filter((f) => f.endsWith('.dc.html') && !NON_ROUTES.has(f))
  .sort();

/** filename → { route, component } for every page, used to rewrite links. */
const ROUTES = new Map();
for (const file of files) {
  const route = routeFor(file);
  if (!route) continue;
  ROUTES.set(file, { route, component: componentName(file) });
}

/** Assets live beside the pages in site/; in the app they are served at root. */
const ASSET_DIRS = readdirSync(SITE, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

function resolveAsset(value) {
  if (!value) return value;
  if (/^(https?:|data:|mailto:|tel:|#|\/)/i.test(value)) return value;
  const clean = value.replace(/^\.\//, '');
  const top = clean.split('/')[0];
  if (ASSET_DIRS.includes(top) || /\.[a-z0-9]{2,5}$/i.test(top)) return '/' + clean;
  return value;
}

function resolveHref(value) {
  if (!value) return null;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return { internal: false, path: value };

  // Bare fragment — stays on the page.
  if (value.startsWith('#')) return { internal: false, path: value };

  const [pathPart, hash = ''] = value.replace(/^\.\//, '').split('#');
  const suffix = hash ? '#' + hash : '';

  if (ALIASES[pathPart]) return { internal: true, path: ALIASES[pathPart] + suffix };

  const hit = ROUTES.get(pathPart);
  if (hit) return { internal: true, path: hit.route + suffix };

  // A .dc.html we do not route (a brief, a design reference) — send it home
  // rather than leaving a link that 404s.
  if (pathPart.endsWith('.dc.html')) return { internal: true, path: '/' + suffix };

  if (!pathPart && suffix) return { internal: false, path: suffix };
  return { internal: false, path: resolveAsset(value) };
}

/* --------------------------------------------------------------- extraction */

const conflicted = [];

/**
 * Resolves unmerged conflict hunks by taking the current side.
 *
 * site/Manifesto.EN and site/Manifesto.KO were committed with conflict markers
 * still in them, so the live pages carry both versions of several blocks. HTML
 * is forgiving enough that this renders *almost* right, which is why it went
 * unnoticed. It is not valid input for a parser, so the HEAD side is taken and
 * the count reported — the two sides differ only in accent colour and band
 * height, so which side wins is a design decision, not a build one.
 *
 * Markers are matched exactly (seven characters), so the 80-character `=`
 * rules used as section separators elsewhere are left alone. The `\r?` on the
 * middle marker is load-bearing: `.gitattributes` is not set, so a Windows
 * checkout hands these files over with CRLF endings, `=======\r` failed the
 * exact match, the resolver never left the `ours` side, and both versions of
 * every hunk — plus the literal `=======` and `>>>>>>> <sha>` lines — were
 * emitted as page copy. Which is what the Manifesto pages shipped.
 */
function resolveConflicts(html, file) {
  if (!/^<{7} /m.test(html)) return { html, hunks: 0 };

  const lines = html.split('\n');
  const out = [];
  let side = 'both';
  let hunks = 0;

  for (const line of lines) {
    if (/^<{7} /.test(line)) { side = 'ours'; hunks++; continue; }
    if (/^={7}\r?$/.test(line) && side === 'ours') { side = 'theirs'; continue; }
    if (/^>{7} /.test(line) && side === 'theirs') { side = 'both'; continue; }
    if (side !== 'theirs') out.push(line);
  }

  conflicted.push({ file, hunks });
  return { html: out.join('\n'), hunks };
}

/** Everything inside <x-dc>…</x-dc>, which is the page proper. */
function extractBody(html) {
  const open = html.indexOf('<x-dc>');
  const close = html.lastIndexOf('</x-dc>');
  if (open === -1 || close === -1) return html;
  return html.slice(open + '<x-dc>'.length, close);
}

/** The page's DCLogic class body, kept as a comment for the hand-written hook. */
function extractLogic(html) {
  const m = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  const body = m ? m[1].trim() : '';
  return body && body.includes('class Component') ? body : '';
}

/** <body style="…"> on the legacy page became the page background. */
function extractBodyStyle(html) {
  const m = /<body([^>]*)>/i.exec(html);
  if (!m) return {};
  const style = /style\s*=\s*"([^"]*)"/i.exec(m[1]);
  if (!style) return {};
  const out = {};
  for (const decl of style[1].split(';')) {
    const [k, v] = decl.split(':');
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

/** Prefixes every selector in a page's CSS so one page cannot restyle another. */
function scopeCss(css, scope) {
  return css.replace(/(^|\})\s*([^@{}]+)\{/g, (match, brace, selectors) => {
    if (/^\s*$/.test(selectors)) return match;
    const scoped = selectors
      .split(',')
      .map((s) => {
        const sel = s.trim();
        if (!sel) return sel;
        if (sel.startsWith('from') || sel.startsWith('to') || /^\d+%$/.test(sel)) return sel;
        if (sel.startsWith('body') || sel.startsWith('html')) return sel.replace(/^(body|html)/, `.${scope}`);
        return `.${scope} ${sel}`;
      })
      .join(', ');
    return `${brace}\n${scoped} {`;
  });
}

/**
 * Root identifiers referenced by `{{ }}` bindings — the values the page's hook
 * has to supply.
 *
 * Read from the tree *after* the data swaps, not from the source: a section
 * replaced by a component takes its bindings with it, and a hook still asked
 * for `v1…v9` would be supplying a filter nothing renders any more.
 *
 * `<sc-for as="person">` introduces `person` inside its own subtree, so it is
 * bound by the loop rather than by the hook, and is excluded.
 */
function bindingIdentifiers(tree) {
  const names = new Set();
  const locals = new Set();

  let html = '';
  const visit = (node) => {
    if (node.type === 'text') html += node.value;
    if (node.type === 'element') {
      for (const a of node.attrs ?? []) if (a.value) html += ` ${a.value} `;
      if (node.tag === 'sc-for') {
        const as = node.attrs?.find((a) => a.name === 'as')?.value;
        if (as) { locals.add(as); locals.add(as + 'Index'); }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  const re = /\{\{([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(html))) {
    const expr = m[1].trim();
    for (const id of expr.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
      const name = id[0];
      if (['true', 'false', 'null', 'undefined', 'this'].includes(name)) continue;
      // Only the head of a member expression, and never a property access.
      const at = id.index;
      if (at > 0 && expr[at - 1] === '.') continue;
      names.add(name);
    }
  }
  return [...names].filter((n) => !locals.has(n)).sort();
}

/* -------------------------------------------------------------- data swaps */

/**
 * Sections that stop being markup and start being data.
 *
 * The card walls on these pages were hand-written HTML — every news item, every
 * workshop, spelled out in the page. They now come from Supabase, so the
 * container is replaced by the component that renders the table, and
 * everything else on the page is converted as usual.
 *
 * Matching is structural (a grid whose children are all cards) rather than by
 * class or position, so an editor reordering sections does not break it.
 */
const DATA_SWAPS = {
  'News.EN.dc.html':      [{ cards: 'article', component: '<NewsGrid feed="news" />', imports: ['NewsGrid'] }],
  'News.KO.dc.html':      [{ cards: 'article', component: '<NewsGrid feed="news" />', imports: ['NewsGrid'] }],
  'Workshop.EN.dc.html': [
    { cards: 'sc-if', component: '<WorkshopWall />', imports: ['WorkshopWall'] },
    // The page's own filter chips. WorkshopWall derives the same chips from the
    // audiences the rows carry, so keeping these would show the row twice.
    { cards: 'button', component: null, imports: [] },
  ],
  'Workshop.KO.dc.html': [
    { cards: ['sc-if', 'a'], component: '<WorkshopWall />', imports: ['WorkshopWall'] },
    { cards: 'button', component: null, imports: [] },
  ],
  'Community.EN.dc.html': [
    { cards: 'article', nth: 0, component: '<CommunityGrid />', imports: ['CommunityGrid'] },
    { cards: 'article', nth: 1, component: '<NewsGrid feed="community" />', imports: ['NewsGrid'] },
  ],
  'Community.KO.dc.html': [
    { cards: 'article', nth: 0, component: '<CommunityGrid />', imports: ['CommunityGrid'] },
    { cards: 'article', nth: 1, component: '<NewsGrid feed="community" />', imports: ['NewsGrid'] },
  ],
  // The wall of project briefs. The block above it stays in the page: it is
  // the one project the index features, and it is laid out rather than listed.
  'Project.EN.dc.html':   [{ cards: 'article', component: '<ProjectWall />', imports: ['ProjectWall'] }],
  'Project.KO.dc.html':   [{ cards: 'article', component: '<ProjectWall />', imports: ['ProjectWall'] }],
  // The directory. Its rows are bare anchors rather than cards, which is the
  // only reason this rule names a tag the other walls do not.
  'Community-Index.EN.dc.html': [
    { cards: 'a', component: '<CommunityIndexList />', imports: ['CommunityIndexList'] },
  ],
  // The home grid's news tile — the one with a dateline, not the insight card
  // beside it. It becomes the newest item on the `home` feed.
  'Home.EN.dc.html': [{ node: isHomeNewsTile, component: '<HomeNewsCard />', imports: ['HomeNewsCard'] }],
  'Home.KO.dc.html': [{ node: isHomeNewsTile, component: '<HomeNewsCard />', imports: ['HomeNewsCard'] }],
};

/**
 * The home page's news tile.
 *
 * Both tiles on that row link to the News page; only this one carries a
 * dateline, which is what distinguishes it from the insight card.
 */
function isHomeNewsTile(node) {
  if (node.type !== 'element' || node.tag !== 'a') return false;
  const href = node.attrs?.find((a) => a.name === 'href')?.value ?? '';
  if (!/^News\./.test(href)) return false;

  let hasDateline = false;
  const visit = (n) => {
    for (const child of n.children ?? []) {
      if (child.type === 'element') {
        const style = child.attrs?.find((a) => a.name === 'style')?.value ?? '';
        const text = (child.children ?? []).filter((c) => c.type === 'text').map((c) => c.value).join('');
        if (style.includes('tracking-eyebrow') && /\d{4}/.test(text)) hasDateline = true;
        visit(child);
      }
    }
  };
  visit(node);
  return hasDateline;
}

/**
 * Grid containers whose children are all cards of one kind, in page order.
 *
 * `tag` may name several — the KO workshop page lists its cards as bare
 * anchors where the EN one wraps each in the filter's `<sc-if>`.
 */
function cardHosts(tree, tags) {
  const wanted = new Set(Array.isArray(tags) ? tags : [tags]);
  const hosts = [];
  const visit = (node) => {
    for (const child of node.children ?? []) {
      if (child.type !== 'element') continue;
      const kids = (child.children ?? []).filter((c) => c.type === 'element');
      if (kids.length > 1 && kids.every((k) => wanted.has(k.tag))) hosts.push({ parent: node, node: child });
      else visit(child);
    }
  };
  visit(tree);
  return hosts;
}

/**
 * Applies every rule against one snapshot of the tree.
 *
 * Hosts are collected before anything is replaced: recomputing between rules
 * would renumber them, and the second rule would then match the first rule's
 * neighbour instead of its own target.
 */
/** The first node satisfying a predicate, with the parent that holds it. */
function matchNode(tree, predicate) {
  const visit = (node) => {
    for (const child of node.children ?? []) {
      if (predicate(child)) return { parent: node, node: child };
      const hit = visit(child);
      if (hit) return hit;
    }
    return null;
  };
  return visit(tree);
}

function applyDataSwaps(tree, file, ctx) {
  const rules = DATA_SWAPS[file];
  if (!rules) return 0;

  const found = new Map();
  for (const rule of rules) {
    if (!rule.cards) continue;
    const key = JSON.stringify(rule.cards);
    if (!found.has(key)) found.set(key, cardHosts(tree, rule.cards));
  }

  let applied = 0;
  for (const rule of rules) {
    // A rule either replaces a grid of cards, or one node matched by predicate.
    const host = rule.node
      ? matchNode(tree, rule.node)
      : found.get(JSON.stringify(rule.cards))[rule.nth ?? 0];
    if (!host) continue;

    const index = host.parent.children.indexOf(host.node);
    if (index === -1) continue;
    if (rule.component === null) host.parent.children.splice(index, 1);
    else host.parent.children[index] = { type: 'component', source: rule.component };
    for (const name of rule.imports) ctx.imports.add(name);
    applied++;
  }
  return applied;
}

/* ---------------------------------------------------------------- collapsing */

/**
 * Page pairs served by one component instead of two.
 *
 * The EN and KO editions of these pages are the same page: same elements, same
 * order, same colours. What differs is the words, the font stack, the `/ko` on
 * the links, and a handful of line-heights that Hangul needs and Latin does
 * not. All four of those can be expressed once, so the page is emitted once
 * and its sentences go to a file per language.
 *
 * Add a base name here to collapse that pair; remove it to go back to two
 * components. Nothing else changes — the routes, the redirects and the design
 * are the same either way.
 */
const COLLAPSED_CANDIDATES = [
  'Are-you-IN', 'Collectives', 'Community', 'Constellation', 'Home', 'MEWE',
  'Manifesto', 'News', 'Project', 'Protagonist', 'Story', 'Story-Index',
  'Workshop', 'Workshop-Bucket-List', 'Workshop-Jungle-Jam',
  'Workshop-Light-Shadow-Shift', 'Workshop-Pathfinder', 'Workshop-Second-Life',
  'Workshop-Shadow-Shifter',
];

/** `News` → `news`, the i18next namespace its words live in. */
const namespaceFor = (base) => base.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();

/** `zh-TW` → `wordsZhTW`, the identifier its word file is imported as. */
const wordIdent = (locale) => `words${locale.replace(/[^A-Za-z0-9]/g, '')}`;

const RESOURCES = join(SRC, 'i18n', 'resources');

/** Mirrors LOCALE_PREFIX in src/i18n/locales.ts for the locales emitted here. */
const LOCALE_PREFIX = { 'zh-TW': 'zh-tw' };
const collapsedPages = [];

/** Routes for the locales a collapsed page serves without a page in `site/`. */
const extraLocaleRoutes = [];

/**
 * Writes one page's words, one file per language.
 *
 * The generated locales come from `site/`, which stays the source of truth —
 * edit the legacy page and re-run. A locale with no page in `site/` gets an
 * empty file *once* and is never written again, because that file is where a
 * translation with no HTML behind it has to live, and clobbering it would
 * delete somebody's work on every build.
 */
function writeWords(namespace, byLocale) {
  for (const [locale, words] of Object.entries(byLocale)) {
    const dir = join(RESOURCES, locale, 'pages');
    mkdirSync(dir, { recursive: true });
    const sorted = Object.fromEntries([...words.entries()].sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(join(dir, `${namespace}.json`), `${JSON.stringify(sorted, null, 2)}\n`);
  }

  for (const locale of HAND_TRANSLATED) {
    const dir = join(RESOURCES, locale, 'pages');
    mkdirSync(dir, { recursive: true });
    const target = join(dir, `${namespace}.json`);
    if (!existsSync(target)) writeFileSync(target, '{}\n');
  }
}

/** Locales with no edition in `site/`, whose words are written by hand. */
const HAND_TRANSLATED = ['zh-TW'];

/**
 * Walks one edition of a page, collecting its words and its inline styles.
 *
 * The JSX it produces is thrown away on the second edition — this is only run
 * twice so the two can be compared. Data swaps are applied to both, because a
 * card wall replaced on one side and not the other would put every following
 * text node at a different number.
 */
function harvest(file) {
  const html = resolveConflicts(readFileSync(join(SITE, file), 'utf8'), file).html;
  const ctx = {
    imports: new Set(),
    styles: [],
    footer: null,
    usesSx: false,
    resolveHref,
    resolveAsset,
    words: new Map(),
    styles2: [],
    tokeniseFonts: true,
  };
  const tree = parse(extractBody(html), []);
  applyDataSwaps(tree, file, ctx);
  toJsx(tree, ctx, 3);
  return { words: ctx.words, styles: ctx.styles2 };
}

/**
 * The inline style values that differ between two editions of a page.
 *
 * Each one becomes a custom property, defined twice: once at the root and once
 * under the other language. That is how a single component keeps a headline at
 * `line-height: 0.98` in English and `1.14` in Korean without knowing which it
 * is rendering.
 */
function styleDifferences(base, other, prefix) {
  const substitutions = new Map();
  const rootVars = [];
  const otherVars = [];
  let n = 0;

  const count = Math.min(base.length, other.length);
  for (let i = 0; i < count; i++) {
    const b = new Map(base[i]);
    const o = new Map(other[i]);
    for (const [prop, value] of b) {
      const alt = o.get(prop);
      if (alt === undefined || alt === value) continue;
      const name = `--${prefix}-${n++}`;
      if (!substitutions.has(i)) substitutions.set(i, new Map());
      substitutions.get(i).set(prop, `var(${name})`);
      rootVars.push(`  ${name}: ${value};`);
      otherVars.push(`  ${name}: ${alt};`);
    }
  }
  return { substitutions, rootVars, otherVars, aligned: base.length === other.length };
}

/**
 * Decides which pairs can be collapsed, before anything is written.
 *
 * It has to happen up front: the second edition of a collapsed pair is skipped
 * during emission, so discovering the pair does not line up *while* emitting
 * would leave that language with no component at all. A pair that fails here
 * simply is not collapsed, and both editions are emitted the way they always
 * were.
 */
const COLLAPSED = new Set();
const COLLAPSE_PLANS = new Map();
const COLLAPSE_REJECTED = [];

for (const name of COLLAPSED_CANDIDATES) {
  const en = `${name}.EN.dc.html`;
  const ko = `${name}.KO.dc.html`;
  if (TAKEN_OVER.has(en) || TAKEN_OVER.has(ko)) continue;
  if (!existsSync(join(SITE, en)) || !existsSync(join(SITE, ko))) continue;

  const mine = harvest(en);
  const theirs = harvest(ko);
  const missing = [...mine.words.keys()].filter((k) => !theirs.words.has(k));

  if (mine.words.size !== theirs.words.size || missing.length) {
    COLLAPSE_REJECTED.push({
      name,
      en: mine.words.size,
      ko: theirs.words.size,
      firstGap: missing[0] ?? null,
    });
    continue;
  }

  COLLAPSED.add(name);
  COLLAPSE_PLANS.set(name, {
    en: mine.words,
    ko: theirs.words,
    diff: styleDifferences(mine.styles, theirs.styles, `in-${namespaceFor(name)}`),
  });
}

/* ------------------------------------------------------------------ emitter */

mkdirSync(PAGES, { recursive: true });
mkdirSync(join(SRC, 'logic'), { recursive: true });

const generated = [];
const needsLogic = [];
const malformed = [];
const dataDriven = [];

for (const file of files) {
  const entry = ROUTES.get(file);
  if (!entry) continue;

  // A page a template has taken over keeps its route and its redirect, and
  // stops getting a component. Its copy is extracted instead — see
  // scripts/extract-detail-pages.mjs.
  const template = TAKEN_OVER.get(file);
  if (template) {
    generated.push({ file, ...entry, template });
    continue;
  }

  const parsed = parseFile(file);
  const collapsed = parsed && COLLAPSED.has(parsed.name);
  const base = collapsed ? parsed.name.replace(/[^A-Za-z0-9]/g, '') : null;

  // The second edition of a collapsed pair keeps its route and its redirect
  // and stops getting a component, exactly as a templated page does. Its words
  // were harvested while the first edition was emitted.
  if (collapsed && parsed.lang !== 'EN') {
    generated.push({ file, ...entry, component: base });
    continue;
  }

  const html = resolveConflicts(readFileSync(join(SITE, file), 'utf8'), file).html;
  const name = collapsed ? base : entry.component;

  const ctx = {
    imports: new Set(),
    styles: [],
    footer: null,
    usesSx: false,
    resolveHref,
    resolveAsset,
  };

  // The differences between the two editions were worked out before the loop.
  // A pair that did not line up is not in COLLAPSED, so it lands here as two
  // ordinary pages and nothing is lost.
  let words = null;
  let langVars = null;
  if (collapsed) {
    const plan = COLLAPSE_PLANS.get(parsed.name);
    ctx.substitutions = plan.diff.substitutions;
    ctx.styles2 = [];
    ctx.tokeniseFonts = true;
    ctx.words = new Map();
    ctx.localizeLinks = true;
    langVars = plan.diff;
    words = { en: plan.en, ko: plan.ko };
  }

  const notes = [];
  const tree = parse(extractBody(html), notes);
  for (const note of notes) malformed.push({ file, ...note });

  const swaps = applyDataSwaps(tree, file, ctx);
  if (swaps) dataDriven.push({ file, swaps });
  const jsx = toJsx(tree, ctx, 3).replace(/\n{3,}/g, '\n\n');

  const scope = 'page-' + name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const css = ctx.styles.join('\n').trim();
  // Values this page sets differently in each language become custom
  // properties, defined once at the root and once under the other language.
  // That is how one component keeps a headline at `line-height: 0.98` in
  // English and 1.14 in Korean without knowing which it is rendering.
  const langCss =
    langVars && langVars.rootVars.length
      ? [
          '/* Set differently per language — mostly leading, which Hangul needs',
          '   more of than Latin does. Generated: edit the legacy pages. */',
          ':root {',
          ...langVars.rootVars,
          '}',
          '',
          ":root[lang='ko'] {",
          ...langVars.otherVars,
          '}',
          '',
        ].join('\n')
      : '';
  if (css || langCss) {
    const body = [langCss, css ? scopeCss(css, scope) : ''].filter(Boolean).join('\n');
    writeFileSync(join(PAGES, `${name}.css`), body + '\n');
  }

  const bindings = bindingIdentifiers(tree);
  const logic = extractLogic(html);
  if (bindings.length) needsLogic.push({ name, file, bindings, logic });

  const bodyStyle = extractBodyStyle(html);
  // No `lang` prop. The route says which language a page is in, and it says
  // so for the templates and the hand-written pages too — a second answer
  // written into every generated file could only ever disagree with it.
  const layoutProps = [`page=${JSON.stringify(file)}`];
  if (bodyStyle.background) layoutProps.push(`background=${JSON.stringify(bodyStyle.background)}`);
  if (bodyStyle.color) layoutProps.push(`color=${JSON.stringify(bodyStyle.color)}`);
  if (css) layoutProps.push(`className=${JSON.stringify(scope)}`);
  if (ctx.footer) {
    const f = [];
    if (ctx.footer.loop) f.push(`loop: ${JSON.stringify(ctx.footer.loop)}`);
    if (ctx.footer.cta) f.push(`cta: ${JSON.stringify(ctx.footer.cta)}`);
    if (ctx.footer.stroke) f.push(`stroke: ${JSON.stringify(ctx.footer.stroke)}`);
    if (f.length) layoutProps.push(`footer={{ ${f.join(', ')} }}`);
  }

  const imports = [];
  if (ctx.imports.has('Fragment')) imports.push(`import { Fragment } from 'react';`);
  if (collapsed && ctx.words.size) {
    // The words come in with the page, not with the shell — see
    // src/i18n/page-words.ts for why.
    const ns = namespaceFor(parsed.name);
    imports.push(`import { usePageWords } from '../i18n/page-words';`);
    for (const locale of ['en', 'zh-TW', 'ko']) {
      imports.push(
        `import ${wordIdent(locale)} from '../i18n/resources/${locale}/pages/${ns}.json';`,
      );
    }
  }
  if (ctx.imports.has('Link')) imports.push(`import { Link } from 'react-router-dom';`);
  imports.push(`import SiteLayout from '../components/SiteLayout';`);
  if (ctx.imports.has('ImageSlot')) imports.push(`import ImageSlot from '../components/ImageSlot';`);
  if (ctx.imports.has('ProjectIndexRail')) imports.push(`import ProjectIndexRail from '../components/ProjectIndexRail';`);
  if (ctx.imports.has('CommunityIndexList')) imports.push(`import CommunityIndexList from '../components/CommunityIndexList';`);
  if (ctx.imports.has('SupabaseForm')) imports.push(`import SupabaseForm from '../components/SupabaseForm';`);
  if (ctx.imports.has('WorkshopRegister')) imports.push(`import WorkshopRegister from '../components/WorkshopRegister';`);
  for (const name of ['NewsGrid', 'WorkshopWall', 'CommunityGrid', 'HomeNewsCard', 'ProjectWall']) {
    if (ctx.imports.has(name)) imports.push(`import ${name} from '../components/cards/${name}';`);
  }
  if (ctx.imports.has('ChipGroup') || ctx.imports.has('Chip')) {
    const named = ['ChipGroup', 'Chip'].filter((n) => ctx.imports.has(n));
    const parts = [];
    if (named.includes('ChipGroup')) parts.push(`import ChipGroup${named.includes('Chip') ? ', { Chip }' : ''} from '../components/ChipGroup';`);
    else parts.push(`import { Chip } from '../components/ChipGroup';`);
    imports.push(...parts);
  }
  if (collapsed && ctx.imports.has('Link')) imports.push(`import { localize, useLocale } from '../lib/lang';`);
  if (ctx.usesSx) imports.push(`import { sx } from '../lib/sx';`);
  if (bindings.length) imports.push(`import useLogic from '../logic/${name}';`);
  if (css || langCss) imports.push(`import './${name}.css';`);

  // A collapsed page reads its words from the catalogue and its links'
  // language from the route. Both are only declared when used, so a page
  // with no links does not carry an unused `locale`.
  const preamble = [];
  if (collapsed && ctx.words.size) {
    const bundles = ['en', 'zh-TW', 'ko']
      .map((locale) => `${JSON.stringify(locale)}: ${wordIdent(locale)}`)
      .join(', ');
    preamble.push(
      `  const t = usePageWords(${JSON.stringify(namespaceFor(parsed.name))}, { ${bundles} });`,
    );
  }
  if (collapsed && ctx.imports.has('Link')) preamble.push('  const locale = useLocale();');
  if (bindings.length) preamble.push(`  const { ${bindings.join(', ')} } = useLogic();`);
  const destructure = preamble.length ? `${preamble.join('\n')}\n\n` : '';

  const source = `${imports.join('\n')}

${collapsed
    ? `/** ${parsed.name} — one component for every language, generated by
 *  scripts/convert-pages.mjs from ${file} and its KO twin. The words live in
 *  src/i18n/resources/<locale>/pages/${namespaceFor(parsed.name)}.json; the
 *  line-heights that differ by language are custom properties in ${name}.css.
 *  Edit the legacy pages, not this file. */`
    : `/** ${file} — generated by scripts/convert-pages.mjs. Edit the legacy page, or
 *  take this file over by hand and remove it from the converter's input. */`}
export default function ${name}() {
${destructure}  return (
    <SiteLayout ${layoutProps.join(' ')}>
${jsx}
    </SiteLayout>
  );
}
`;

  writeFileSync(join(PAGES, `${name}.tsx`), source);
  if (collapsed) {
    writeWords(namespaceFor(parsed.name), { en: ctx.words, ko: words.ko });
    extraLocaleRoutes.push(
      ...HAND_TRANSLATED.map((locale) => ({ locale, route: entry.route, component: name })),
    );
    collapsedPages.push({ name, namespace: namespaceFor(parsed.name), strings: ctx.words.size });
  }
  generated.push({ file, ...entry, ...(collapsed ? { component: name } : {}) });
}

/* --------------------------------------------------------- page word bundles */

// A module listing every collapsed page's words. Nothing imports it at
// runtime — the pages carry their own — but i18next.d.ts types the catalogue
// off it, so `t('001_h1')` is checked against the words actually extracted.
if (collapsedPages.length) {
  const locales = ['en', 'zh-TW', 'ko'];
  const ident = (locale, ns) =>
    `${locale.replace(/[^A-Za-z0-9]/g, '')}_${ns.replace(/[^A-Za-z0-9]/g, '_')}`;

  const imports = [];
  for (const locale of locales) {
    for (const page of collapsedPages) {
      imports.push(
        `import ${ident(locale, page.namespace)} from './${locale}/pages/${page.namespace}.json';`,
      );
    }
  }

  const bundles = locales
    .map((locale) => {
      const entries = collapsedPages
        .map((page) => `    ${JSON.stringify(page.namespace)}: ${ident(locale, page.namespace)},`)
        .join('\n');
      return `  ${JSON.stringify(locale)}: {\n${entries}\n  },`;
    })
    .join('\n');

  const source = `// Generated by scripts/convert-pages.mjs — do not edit by hand.
${imports.join('\n')}

/**
 * The words of every page that is served by one component in every language.
 *
 * A collapsed page keeps its structure in src/pages and its sentences here,
 * one namespace per page and one file per language. The English and Korean
 * files are extracted from site/; a language with no page in site/ has an
 * empty file that the converter creates once and never overwrites, because
 * that is where a translation with no HTML behind it has to live.
 */
export const PAGE_RESOURCES = {
${bundles}
} as const;

export const PAGE_NAMESPACES = [
${collapsedPages.map((p) => `  ${JSON.stringify(p.namespace)},`).join('\n')}
] as const;
`;
  writeFileSync(join(RESOURCES, 'pages.ts'), source);
}

/* ------------------------------------------------------------- route tables */

// One entry per route a template serves, however many pages it took over.
const templateNames = [...new Set(generated.filter((g) => g.template).map((g) => g.template))].sort();
const templateRoutes = templateNames.flatMap((name) =>
  routesForTemplate(name).map((route) => `  ${JSON.stringify(route)}: lazy(() => import('./templates/${name}')),`),
);

// The same paths as plain strings, emitted into route-map.ts. The shell needs
// to ask "is this a route?" — that is how the language switch knows whether a
// page has a twin — and asking the registry drags every page's dynamic import
// into the shell's chunk.
// A collapsed page answers in every language, including the ones with no
// edition in `site/` — their words come from a hand-written file that falls
// back to English until somebody fills it in.
const localeRoutes = extraLocaleRoutes.map(({ locale, route, component }) => ({
  route: route === '/' ? `/${LOCALE_PREFIX[locale]}` : `/${LOCALE_PREFIX[locale]}${route}`,
  component,
}));

const routePaths = [
  ...generated.filter((g) => !g.template).map((g) => g.route),
  ...localeRoutes.map((r) => r.route),
  ...templateNames.flatMap((name) => routesForTemplate(name)),
];

const registry = `// Generated by scripts/convert-pages.mjs — do not edit by hand.
import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

/**
 * Clean route path → the page that renders it.
 *
 * Mostly one converted page each. The \`:slug\` patterns at the end are the
 * hand-written templates, which serve a family of pages that differed only in
 * their words — React Router ranks a static path above a dynamic one, so a
 * page that still has a component of its own keeps winning its route.
 */
export const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
${generated.filter((g) => !g.template).map((g) => `  ${JSON.stringify(g.route)}: lazy(() => import('./${g.component}')),`).join('\n')}\n${localeRoutes.map((r) => `  ${JSON.stringify(r.route)}: lazy(() => import('./${r.component}')),`).join('\n')}

${templateRoutes.join('\n')}
};

`;
writeFileSync(join(PAGES, 'registry.ts'), registry);

// An alias for a filename that is itself a page would be a duplicate key.
// ME=WE.EN.dc.html is both: a real page, and the copy MEWE.EN superseded.
const generatedFiles = new Set(generated.map((g) => g.file));
const aliasEntries = Object.entries(ALIASES)
  .filter(([f]) => !generatedFiles.has(f))
  .map(([f, r]) => `  ${JSON.stringify(f)}: ${JSON.stringify(r)},`);
// This used to emit a second table, LANG_ALTERNATES, pairing each route with
// its twin in the other language. It could only ever hold the pairs the
// converter knew about — never a `:slug` route, never a page added by hand —
// so fifteen English routes had no entry and the EN/KR switch dropped all of
// them on the Korean home page. lib/lang.ts derives the pair from the path
// instead, checked against the live route table.
const routeMap = `// Generated by scripts/convert-pages.mjs — do not edit by hand.

/**
 * Legacy filename → clean route.
 *
 * Every URL the old static site ever served has an entry here, so an inbound
 * link or a bookmark to \`/Workshop.EN.dc.html\` still lands on \`/workshop\`
 * instead of a 404.
 */
export const LEGACY_ROUTES: Record<string, string> = {
${generated.map((g) => `  ${JSON.stringify(g.file)}: ${JSON.stringify(g.route)},`).join('\n')}
${aliasEntries.join('\n')}
};

/**
 * Every path the router serves, patterns included.
 *
 * The registry's keys, as data — so a module can ask whether a path is a
 * route without importing the registry and, with it, the dynamic import of
 * all fifty-four pages. lib/lang.ts asks on every render, and reaching for
 * the registry to ask pulled 200 kB of Supabase client into the shell chunk.
 */
export const ROUTE_PATHS: string[] = [
${routePaths.map((route) => `  ${JSON.stringify(route)},`).join('\n')}
];
`;
mkdirSync(join(SRC, 'lib'), { recursive: true });
writeFileSync(join(SRC, 'lib', 'route-map.ts'), routeMap);

/* ----------------------------------------------------------------- logic stubs */

for (const page of needsLogic) {
  const target = join(SRC, 'logic', `${page.name}.ts`);
  if (existsSync(target)) continue; // never clobber a hand-written hook

  // A page that has just been collapsed changes name — Collectives.EN becomes
  // Collectives — and its hand-written hook is still filed under the old one.
  // Writing a stub here would look like a new page needing one and would bury
  // the real hook under a component that returns `undefined as never`.
  const perLanguage = ['EN', 'KO']
    .map((lang) => join(SRC, 'logic', `${page.name}${lang}.ts`))
    .filter((path) => existsSync(path));
  if (perLanguage.length) {
    console.log('');
    console.log(`!! ${page.name} was collapsed but its logic hook still has the old name.`);
    for (const path of perLanguage) console.log(`   ${path.split(/[\/]/).slice(-2).join('/')}`);
    console.log(`   Move it to logic/${page.name}.ts and make it read the locale off the route.`);
    process.exitCode = 1;
    continue;
  }

  const stub = `/**
 * ${page.file} — page logic.
 *
 * STUB. The legacy page carried a DCLogic class; its renderVals() is quoted
 * below. Port it to real React state and delete this notice.
 */
export default function useLogic() {
  return {
${page.bindings.map((b) => `    ${b}: undefined as never,`).join('\n')}
  };
}

/* Legacy source:
${page.logic.replace(/\*\//g, '*\\/')}
*/
`;
  writeFileSync(target, stub);
}

if (COLLAPSED.size || COLLAPSE_REJECTED.length) {
  console.log('');
  console.log(
    `collapsed:  ${COLLAPSED.size} page pairs → one component each` +
      (COLLAPSE_REJECTED.length ? `, ${COLLAPSE_REJECTED.length} left as two` : ''),
  );
  for (const page of collapsedPages) console.log(`   ${page.name} — ${page.strings} strings`);
  for (const r of COLLAPSE_REJECTED) {
    console.log(
      `   ! ${r.name} — EN has ${r.en} strings, KO has ${r.ko}` +
        (r.firstGap ? `; first gap at ${r.firstGap}` : ''),
    );
  }
  if (COLLAPSE_REJECTED.length) {
    console.log('     Their structures have drifted. Reconcile them in site/ to collapse them.');
  }
}

if (malformed.length) {
  console.log('');
  console.log('!! malformed markup in the source — kept as the browser renders it:');
  for (const m of malformed) console.log(`   ${m.file} — stray "<" near: ${m.near.replace(/\s+/g, ' ').slice(-56)}`);
}

if (conflicted.length) {
  console.log('');
  console.log('!! unmerged conflict markers in the source — HEAD side taken:');
  for (const c of conflicted) console.log(`   ${c.file} — ${c.hunks} hunk(s)`);
  console.log('');
}

const takenOver = generated.filter((g) => g.template);
console.log(`pages:      ${generated.length - takenOver.length} converted + ${takenOver.length} served by a template`);
for (const name of [...new Set(takenOver.map((g) => g.template))].sort()) {
  const served = takenOver.filter((g) => g.template === name);
  console.log(`  ${routesForTemplate(name).join(' + ')} → templates/${name} (${served.length} pages)`);
}
console.log(`data-driven: ${dataDriven.map((d) => `${d.file} (${d.swaps})`).join(', ')}`);
console.log(`with logic: ${needsLogic.length} → ${needsLogic.map((p) => p.name).join(', ')}`);
