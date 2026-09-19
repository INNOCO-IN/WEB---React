/**
 * Legacy filename → clean route.
 *
 * The old site had no router: every page was a file, and the language and the
 * section both lived in the filename (`Workshop-Mobius-Making.KO.dc.html`).
 * Here the language becomes a path prefix and the section becomes a path
 * segment, which is what makes `/workshop/:slug` a single React route instead
 * of ten hard-coded ones.
 *
 * Nothing is thrown away: every old filename keeps an entry so the redirect
 * layer can answer an inbound link to `/Workshop.EN.dc.html` with a 301-style
 * <Navigate replace> to `/workshop`.
 */

/** Files that were never routes — shared components and design references. */
export const NON_ROUTES = new Set([
  'Nav.dc.html',
  'Nav-KO.dc.html',
  'Footer.dc.html',
  'Footer-KO.dc.html',
  'ProjectIndexRail.dc.html',
  'ProjectIndexRail-KO.dc.html',
  'Cards.EN.dc.html',
  'IN Design System.dc.html',

  // The three Global Lab briefs, in both languages. The 2026 handoff lists them
  // in its sitemap, but they are not pages: each is `<doc-page size="a4">` laid
  // out in millimetres, driven by a `doc-page.js` the bundle does not ship, and
  // opening with `doc-page:not(:defined) { visibility: hidden; }` — so as a
  // route each one is a blank screen. They stay in `site/` as the print
  // originals they are.
  'WS-HTP.EN.dc.html',
  'WS-HTP.KO.dc.html',
  'WS-Foresight.EN.dc.html',
  'WS-Foresight.KO.dc.html',
  'WS-Springtime.EN.dc.html',
  'WS-Springtime.KO.dc.html',
]);

/**
 * Pages a hand-written template renders, and the template that renders them.
 *
 * A family of pages that differ only in their words does not need a component
 * each. Where one has been written by hand, its source pages stay listed here
 * rather than being deleted from `site/`: the converter still needs them to
 * resolve links and to keep every legacy URL redirecting, and their copy is
 * still extracted from them — it just stops emitting a component per page.
 *
 * This is the mechanism the generated header has always pointed at: *take this
 * file over by hand and remove it from the converter's input.*
 */
export const TAKEN_OVER = new Map([
  ['Project-BridgeBuilder-Program.EN.dc.html', 'ProjectDetail'],
  ['Project-BridgeBuilder-Program.KO.dc.html', 'ProjectDetail'],
  ['Project-CTN.EN.dc.html', 'ProjectDetail'],
  ['Project-CTN.KO.dc.html', 'ProjectDetail'],
  ['Project-GYEM.EN.dc.html', 'ProjectDetail'],
  ['Project-GYEM.KO.dc.html', 'ProjectDetail'],
  ['Project-I-Grow-Seed.EN.dc.html', 'ProjectDetail'],
  ['Project-I-Grow-Seed.KO.dc.html', 'ProjectDetail'],
  ['Project-tasmena.EN.dc.html', 'ProjectDetail'],
  ['Project-tasmena.KO.dc.html', 'ProjectDetail'],

  ['Community-Animators.EN.dc.html', 'CommunityDetail'],
  ['Community-Animators.KO.dc.html', 'CommunityDetail'],
  ['Community-BridgeBuilders.EN.dc.html', 'CommunityDetail'],
  ['Community-BridgeBuilders.KO.dc.html', 'CommunityDetail'],
  ['Community-Facilitators.EN.dc.html', 'CommunityDetail'],
  ['Community-Facilitators.KO.dc.html', 'CommunityDetail'],
  ['Community-IN-Collectives.EN.dc.html', 'CommunityDetail'],
  ['Community-IN-Collectives.KO.dc.html', 'CommunityDetail'],
  ['Community-Nepal-Youth-Cluster.EN.dc.html', 'CommunityDetail'],
  ['Community-Nepal-Youth-Cluster.KO.dc.html', 'CommunityDetail'],
  ['Community-Open-Studio.EN.dc.html', 'CommunityDetail'],
  ['Community-Open-Studio.KO.dc.html', 'CommunityDetail'],
  ['Community-UAE-Youth-Cluster.EN.dc.html', 'CommunityDetail'],
  ['Community-UAE-Youth-Cluster.KO.dc.html', 'CommunityDetail'],

  ['Workshop-Heros-Journey.EN.dc.html', 'WorkshopDetail'],
  ['Workshop-Heros-Journey.KO.dc.html', 'WorkshopDetail'],
  ['Workshop-Metanoia.EN.dc.html', 'WorkshopDetail'],
  ['Workshop-Metanoia.KO.dc.html', 'WorkshopDetail'],
  ['Workshop-Mobius-Making.EN.dc.html', 'WorkshopDetail'],
  ['Workshop-Mobius-Making.KO.dc.html', 'WorkshopDetail'],
  ['Workshop-Two-Wings.EN.dc.html', 'WorkshopDetail'],
  ['Workshop-Two-Wings.KO.dc.html', 'WorkshopDetail'],
]);

/**
 * The URL prefix each language answers under. The default locale has none.
 *
 * `site/` holds at most two editions of a page, EN and KO, so for those the
 * filename says which language it is. Traditional Chinese has no edition and
 * is not going to get one — its words are written by hand against the English
 * page — so the only place it can be written down is here. That is exactly
 * why it kept being left out: every other part of the pipeline can read the
 * language off a filename, and this one cannot.
 *
 * Mirrors LOCALE_PREFIX in src/i18n/locales.ts.
 */
export const LOCALE_PREFIX = { en: '', ko: '/ko', 'zh-TW': '/zh-tw' };

/** Locales with no edition in `site/`, whose words are written by hand. */
export const HAND_TRANSLATED = ['zh-TW'];

/** Base path per template, before the language prefix. */
const TEMPLATE_PATHS = {
  ProjectDetail: '/project/:slug',
  CommunityDetail: '/community/:slug',
  WorkshopDetail: '/workshop/:slug',
};

/**
 * Template → the route patterns it serves, one per language.
 *
 * One entry in the registry per language, not one per page it replaced. React
 * Router ranks a static path above a dynamic one, so the richer project pages
 * that still have components of their own keep winning
 * `/project/asia-exchange`.
 *
 * The languages are spread over the base path rather than listed, because a
 * hand-written list is how `/zh-tw/workshop/mobius-making` came to be a 404
 * while its English and Korean twins worked: the template reads the language
 * off the path and renders all three perfectly well, and simply had no route
 * saying so.
 */
export const TEMPLATES = Object.fromEntries(
  Object.entries(TEMPLATE_PATHS).map(([name, path]) => [
    name,
    Object.values(LOCALE_PREFIX).map((prefix) => `${prefix}${path}`),
  ]),
);

/** Every route a template serves, however it was written. */
export const routesForTemplate = (name) =>
  Array.isArray(TEMPLATES[name]) ? TEMPLATES[name] : [TEMPLATES[name]];

/** Old file → route, where the default rule would get it wrong. */
const EXPLICIT = {
  'Home': '',
  'Are-you-IN': 'connect',
  'Community-Index': 'community/all',
  'Story-Index': 'story/all',
  'Story-Submission': 'story/submit',
  'Action-Research': 'action-research',
};

/** Sections whose detail pages nest under the index page's path. */
const NESTED = ['Workshop', 'Project', 'Community'];

/** `Light-Shadow-Shift` → `light-shadow-shift` */
function slugify(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Splits `Workshop-Mobius-Making.EN.dc.html` into its parts.
 * Returns null for anything that is not a page file.
 */
export function parseFile(file) {
  const m = /^(.*)\.(EN|KO)\.dc\.html$/.exec(file);
  if (!m) return null;
  return { name: m[1], lang: m[2] };
}

/** Component name for a page file: `Workshop-Mobius-Making.EN` → `WorkshopMobiusMakingEN`. */
export function componentName(file) {
  const parsed = parseFile(file);
  if (!parsed) return null;
  const base = parsed.name
    .replace(/=/g, 'Eq')
    .replace(/'/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');
  return base + parsed.lang;
}

/** Clean route path for a page file, e.g. `/ko/workshop/mobius-making`. */
export function routeFor(file) {
  const parsed = parseFile(file);
  if (!parsed) return null;
  const { name, lang } = parsed;

  let tail = EXPLICIT[name];

  if (tail === undefined) {
    const section = NESTED.find((s) => name.startsWith(s + '-'));
    tail = section
      ? `${slugify(section)}/${slugify(name.slice(section.length + 1))}`
      : slugify(name);
  }

  const prefix = lang === 'KO' ? '/ko' : '';
  const path = tail ? `${prefix}/${tail}` : prefix || '/';
  return path;
}

/**
 * Routes that exist only as redirects — a page the site superseded, or an
 * alternate spelling that was linked from somewhere.
 *
 * The entries whose file is no longer in `site/` are the point of this table
 * rather than an oversight: the file is gone, and the URL it used to answer is
 * still written down in somebody's bookmarks.
 */
export const ALIASES = {
  // Three spellings of one page. `MEWE` is the file in `site/`; `ME=WE` is what
  // the components tree calls it; `ME-WE` is what the 2026 bundle exports it
  // as. A bundle taken with an unknown filename produces a page at no route at
  // all — it is not in `site/`, so nothing redirects it, and it renders
  // perfectly well at a URL nothing links to. Naming the spelling is cheaper
  // than discovering that.
  'ME=WE.EN.dc.html': '/mewe',
  'ME-WE.EN.dc.html': '/mewe',
  'ME-WE.KO.dc.html': '/ko/mewe',
  'index.html': '/',
  'kr.html': '/ko',

  // Renamed by the 2026 design. See RENAMED_ROUTES for the clean URLs.
  'Collectives.EN.dc.html': '/people',
  'Collectives.KO.dc.html': '/ko/people',
  'Protagonist.EN.dc.html': '/pathway',
  'Protagonist.KO.dc.html': '/ko/pathway',
  'Story-This-Is-Us.EN.dc.html': '/story',
};

/**
 * Clean route → the clean route that replaced it.
 *
 * ALIASES answers for the old *filenames*; this answers for the URLs the React
 * app has been serving. `Collectives` became `People` and `Protagonist` became
 * `Pathway` in the design, which renames two pages the site has already been
 * publishing under the old words — so `/collectives` has to keep resolving, and
 * has to resolve to one place, or the same page sits at two URLs and neither is
 * canonical.
 *
 * `/story/this-is-us` is not a rename: the design dropped the page. It goes to
 * the section above it, which is the nearest thing that still exists.
 */
export const RENAMED_ROUTES = {
  '/collectives': '/people',
  '/ko/collectives': '/ko/people',
  '/protagonist': '/pathway',
  '/ko/protagonist': '/ko/pathway',
  '/story/this-is-us': '/story',
};

/** The counterpart page in the other language, for the EN/KR switch. */
/**
 * The same legacy page in the other language, by filename.
 *
 * No longer used to emit a route table — the app derives the pair from the
 * path at runtime, which also covers the `:slug` routes a filename table
 * cannot. Kept because the filenames are still how `site/` says the two pages
 * are the same page.
 */
export function altLangRoute(file) {
  const parsed = parseFile(file);
  if (!parsed) return null;
  const other = parsed.lang === 'EN' ? 'KO' : 'EN';
  return `${parsed.name}.${other}.dc.html`;
}
