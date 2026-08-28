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
  'Cards.EN.dc.html',
  'Card System Prototype.EN.dc.html',
  'IN Design System.dc.html',
  'Story Submission Brief.EN.dc.html',
  // Superseded by MEWE.EN. Kept out of the routes so its URL redirects to the
  // page that replaced it, rather than serving a second copy of it.
  'ME=WE.EN.dc.html',
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
  ['Project-CTN.EN.dc.html', 'ProjectDetail'],
  ['Project-GYEM.EN.dc.html', 'ProjectDetail'],
  ['Project-I-Grow-Seed.EN.dc.html', 'ProjectDetail'],
  ['Project-tasmena.EN.dc.html', 'ProjectDetail'],

  ['Community-Animators.EN.dc.html', 'CommunityDetail'],
  ['Community-BridgeBuilders.EN.dc.html', 'CommunityDetail'],
  ['Community-Facilitators.EN.dc.html', 'CommunityDetail'],
  ['Community-IN-Collectives.EN.dc.html', 'CommunityDetail'],
  ['Community-Nepal-Youth-Cluster.EN.dc.html', 'CommunityDetail'],
  ['Community-Open-Studio.EN.dc.html', 'CommunityDetail'],
  ['Community-UAE-Youth-Cluster.EN.dc.html', 'CommunityDetail'],

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
 * Template → the route pattern, or patterns, it serves.
 *
 * One entry in the registry, not one per page it replaced. React Router ranks
 * a static path above a dynamic one, so the richer project pages that still
 * have components of their own keep winning `/project/asia-exchange`.
 *
 * A template that serves both languages names both paths: the workshop pages
 * are the same layout with different words, so one component renders
 * `/workshop/metanoia` and `/ko/workshop/metanoia` and reads the language off
 * the path.
 */
export const TEMPLATES = {
  ProjectDetail: '/project/:slug',
  CommunityDetail: '/community/:slug',
  WorkshopDetail: ['/workshop/:slug', '/ko/workshop/:slug'],
};

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
  'Story-This-Is-Us': 'story/this-is-us',
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
 */
export const ALIASES = {
  'ME=WE.EN.dc.html': '/mewe',
  'index.html': '/',
  'kr.html': '/ko',
};

/** The counterpart page in the other language, for the EN/KR switch. */
export function altLangRoute(file) {
  const parsed = parseFile(file);
  if (!parsed) return null;
  const other = parsed.lang === 'EN' ? 'KO' : 'EN';
  return `${parsed.name}.${other}.dc.html`;
}
