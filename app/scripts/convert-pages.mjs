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
  parseFile, componentName, routeFor, altLangRoute,
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
 * rules used as section separators elsewhere are left alone.
 */
function resolveConflicts(html, file) {
  if (!/^<{7} /m.test(html)) return { html, hunks: 0 };

  const lines = html.split('\n');
  const out = [];
  let side = 'both';
  let hunks = 0;

  for (const line of lines) {
    if (/^<{7} /.test(line)) { side = 'ours'; hunks++; continue; }
    if (/^={7}$/.test(line) && side === 'ours') { side = 'theirs'; continue; }
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
  'News.KO.dc.html':      [{ cards: 'article', component: '<NewsGrid feed="news" lang="KO" />', imports: ['NewsGrid'] }],
  'Workshop.EN.dc.html': [
    { cards: 'sc-if', component: '<WorkshopWall />', imports: ['WorkshopWall'] },
    // The page's own filter chips. WorkshopWall derives the same chips from the
    // audiences the rows carry, so keeping these would show the row twice.
    { cards: 'button', component: null, imports: [] },
  ],
  'Workshop.KO.dc.html': [
    { cards: ['sc-if', 'a'], component: '<WorkshopWall lang="KO" />', imports: ['WorkshopWall'] },
    { cards: 'button', component: null, imports: [] },
  ],
  'Community.EN.dc.html': [
    { cards: 'article', nth: 0, component: '<CommunityGrid />', imports: ['CommunityGrid'] },
    { cards: 'article', nth: 1, component: '<NewsGrid feed="community" />', imports: ['NewsGrid'] },
  ],
  'Community.KO.dc.html': [
    { cards: 'article', nth: 0, component: '<CommunityGrid lang="KO" />', imports: ['CommunityGrid'] },
    { cards: 'article', nth: 1, component: '<NewsGrid feed="community" lang="KO" />', imports: ['NewsGrid'] },
  ],
  // The wall of project briefs. The block above it stays in the page: it is
  // the one project the index features, and it is laid out rather than listed.
  'Project.EN.dc.html':   [{ cards: 'article', component: '<ProjectWall />', imports: ['ProjectWall'] }],
  'Project.KO.dc.html':   [{ cards: 'article', component: '<ProjectWall lang="KO" />', imports: ['ProjectWall'] }],
  // The directory. Its rows are bare anchors rather than cards, which is the
  // only reason this rule names a tag the other walls do not.
  'Community-Index.EN.dc.html': [
    { cards: 'a', component: '<CommunityIndexList />', imports: ['CommunityIndexList'] },
  ],
  // The home grid's news tile — the one with a dateline, not the insight card
  // beside it. It becomes the newest item on the `home` feed.
  'Home.EN.dc.html': [{ node: isHomeNewsTile, component: '<HomeNewsCard />', imports: ['HomeNewsCard'] }],
  'Home.KO.dc.html': [{ node: isHomeNewsTile, component: '<HomeNewsCard lang="KO" />', imports: ['HomeNewsCard'] }],
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
    generated.push({ file, ...entry, alt: altLangRoute(file), template });
    continue;
  }

  const html = resolveConflicts(readFileSync(join(SITE, file), 'utf8'), file).html;
  const name = entry.component;
  const parsed = parseFile(file);

  const ctx = {
    imports: new Set(),
    styles: [],
    footer: null,
    usesSx: false,
    resolveHref,
    resolveAsset,
  };

  const notes = [];
  const tree = parse(extractBody(html), notes);
  for (const note of notes) malformed.push({ file, ...note });

  const swaps = applyDataSwaps(tree, file, ctx);
  if (swaps) dataDriven.push({ file, swaps });
  const jsx = toJsx(tree, ctx, 3).replace(/\n{3,}/g, '\n\n');

  const scope = 'page-' + name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const css = ctx.styles.join('\n').trim();
  if (css) writeFileSync(join(PAGES, `${name}.css`), scopeCss(css, scope) + '\n');

  const bindings = bindingIdentifiers(tree);
  const logic = extractLogic(html);
  if (bindings.length) needsLogic.push({ name, file, bindings, logic });

  const bodyStyle = extractBodyStyle(html);
  const layoutProps = [`lang="${parsed.lang}"`, `page=${JSON.stringify(file)}`];
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
  if (ctx.imports.has('Link')) imports.push(`import { Link } from 'react-router-dom';`);
  imports.push(`import SiteLayout from '../components/SiteLayout';`);
  if (ctx.imports.has('ImageSlot')) imports.push(`import ImageSlot from '../components/ImageSlot';`);
  if (ctx.imports.has('ProjectIndexRail')) imports.push(`import ProjectIndexRail from '../components/ProjectIndexRail';`);
  if (ctx.imports.has('CommunityIndexList')) imports.push(`import CommunityIndexList from '../components/CommunityIndexList';`);
  if (ctx.imports.has('SupabaseForm')) imports.push(`import SupabaseForm from '../components/SupabaseForm';`);
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
  if (ctx.usesSx) imports.push(`import { sx } from '../lib/sx';`);
  if (bindings.length) imports.push(`import useLogic from '../logic/${name}';`);
  if (css) imports.push(`import './${name}.css';`);

  const destructure = bindings.length
    ? `  const { ${bindings.join(', ')} } = useLogic();\n\n`
    : '';

  const source = `${imports.join('\n')}

/** ${file} — generated by scripts/convert-pages.mjs. Edit the legacy page, or
 *  take this file over by hand and remove it from the converter's input. */
export default function ${name}() {
${destructure}  return (
    <SiteLayout ${layoutProps.join(' ')}>
${jsx}
    </SiteLayout>
  );
}
`;

  writeFileSync(join(PAGES, `${name}.tsx`), source);
  generated.push({ file, ...entry, alt: altLangRoute(file) });
}

/* ------------------------------------------------------------- route tables */

// One entry per route a template serves, however many pages it took over.
const templateRoutes = [...new Set(generated.filter((g) => g.template).map((g) => g.template))]
  .sort()
  .flatMap((name) =>
    routesForTemplate(name).map((route) => `  ${JSON.stringify(route)}: lazy(() => import('./templates/${name}')),`),
  );

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
${generated.filter((g) => !g.template).map((g) => `  ${JSON.stringify(g.route)}: lazy(() => import('./${g.component}')),`).join('\n')}

${templateRoutes.join('\n')}
};

export const ROUTE_PATHS = Object.keys(PAGES);
`;
writeFileSync(join(PAGES, 'registry.ts'), registry);

// An alias for a filename that is itself a page would be a duplicate key.
// ME=WE.EN.dc.html is both: a real page, and the copy MEWE.EN superseded.
const generatedFiles = new Set(generated.map((g) => g.file));
const aliasEntries = Object.entries(ALIASES)
  .filter(([f]) => !generatedFiles.has(f))
  .map(([f, r]) => `  ${JSON.stringify(f)}: ${JSON.stringify(r)},`);
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

/** Clean route → the same page in the other language, for the EN/KR switch. */
export const LANG_ALTERNATES: Record<string, string> = {
${generated
  .filter((g) => g.alt && ROUTES.has(g.alt))
  .map((g) => `  ${JSON.stringify(g.route)}: ${JSON.stringify(ROUTES.get(g.alt).route)},`)
  .join('\n')}
};
`;
mkdirSync(join(SRC, 'lib'), { recursive: true });
writeFileSync(join(SRC, 'lib', 'route-map.ts'), routeMap);

/* ----------------------------------------------------------------- logic stubs */

for (const page of needsLogic) {
  const target = join(SRC, 'logic', `${page.name}.ts`);
  if (existsSync(target)) continue; // never clobber a hand-written hook

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
