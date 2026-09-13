import type { ContentTable, Feed } from './content/types';
import type { Locale } from '../i18n/locales';

/**
 * What every page is made of.
 *
 * One entry per route, naming the tables that page reads and writes. It is a
 * declaration rather than a derivation: the pages themselves are generated from
 * `site/`, so the only place the site's shape can be stated rather than
 * inferred is here.
 *
 * It earns its keep three ways.
 *
 * - **The content map.** The route/table table in `CONTENT.md` is written from
 *   this file by `scripts/content-map.mjs`, so the document cannot drift from
 *   the code the way a hand-kept table does. That script also fails on a route
 *   with no model, or a model with no route.
 * - **It is checked against what the pages do.** The hooks are what actually
 *   read and subscribe — a component that needs news calls `useNews`, which
 *   names `news` itself. This file is the second opinion: in development the
 *   overlay flags a page whose model names a table the page never reads, which
 *   is how a model goes quietly wrong.
 * - **Gaps are recorded, not remembered.** `gaps` names a table a page ought to
 *   read and does not yet. A gap in a list is a task; a gap in someone's memory
 *   is a bug that resurfaces a year later — which is what the three it held
 *   were: the project index carrying eight links of the thirteen projects that
 *   exist, five of those projects with no row to be listed from, and a
 *   directory of "every community" that was one short. All three read their
 *   table now, and no entry declares a gap. The field stays for the next one.
 *
 * Nothing on the public site imports this file, and it is written so that the
 * production build can drop it: no computation at module scope, or the bundler
 * has to keep seventy entries of prose nobody reads.
 *
 * Most pages name no table at all, and that is the answer rather than a missing
 * entry: the manifesto, the MEWE essay and the workshop write-ups are laid out
 * as much as they are written, so their copy lives in the component. The
 * workshop detail pages are the interesting near-miss — the `workshops` row
 * behind each one carries its title, blurb and audience for the card wall, but
 * the page renders its own copy, so the model says it reads nothing. It writes,
 * though: each of them ends in a sign-up.
 */

export type Section = 'home' | 'start-here' | 'go-further' | 'bigger-picture' | 'connect';

/** A table a page reads, and what its rows become on the page. */
export interface Reads {
  table: ContentTable;
  drives: string;
  /** For `news`, which of its feeds this page draws. */
  feed?: Feed;
}

/** A table a page writes to — the enquiry, the story, the workshop sign-up. */
export interface Writes {
  table: ContentTable;
  drives: string;
}

export interface PageModel {
  lang: Locale;
  /** The nav group this page sits in. */
  section: Section;
  /** What the nav, or the page's own heading, calls it. */
  title: string;
  reads?: Reads[];
  writes?: Writes[];
  /** Content that belongs in a table and is still written into the page. */
  gaps?: Reads[];
}

/**
 * The sign-up every workshop page carries.
 *
 * Declared once rather than fourteen times: the `#register` band is the same
 * component on every one of them, so it is one fact about fourteen routes
 * rather than fourteen facts. The band is where the hero's "Register now" has
 * always pointed — see components/WorkshopRegister.
 */
const WORKSHOP_SIGNUP: Writes[] = [
  { table: 'workshop_registrations', drives: 'the sign-up in the register band' },
];

/** Route → model. The keys match `pages/registry.ts` exactly. */
export const PAGE_MODELS: Record<string, PageModel> = {
  '/': {
    lang: 'en',
    section: 'home',
    title: 'Home',
    reads: [
      { table: 'news', feed: 'home', drives: 'the news tile in the card grid — the newest item on the home feed' },
    ],
  },
  '/ko': {
    lang: 'ko',
    section: 'home',
    title: 'Home',
    reads: [
      { table: 'news', feed: 'home', drives: 'the news tile in the card grid — the newest item on the home feed' },
    ],
  },
  '/zh-tw': {
    lang: 'zh-TW',
    section: 'home',
    title: 'Home',
    reads: [
      { table: 'news', feed: 'home', drives: 'the news tile in the card grid — the newest item on the home feed' },
    ],
  },
  '/action-research': { lang: 'en', section: 'bigger-picture', title: 'Action Research' },
  '/ko/action-research': { lang: 'ko', section: 'bigger-picture', title: 'Action Research' },
  '/zh-tw/action-research': { lang: 'zh-TW', section: 'bigger-picture', title: 'Action Research' },
  '/bridge-builder': { lang: 'en', section: 'bigger-picture', title: 'Bridge Builder' },
  '/ko/bridge-builder': { lang: 'ko', section: 'bigger-picture', title: 'Bridge Builder' },
  '/community': {
    lang: 'en',
    section: 'go-further',
    title: 'Community',
    reads: [
      { table: 'communities', drives: 'the circles grid' },
      { table: 'news', feed: 'community', drives: 'the news grid below the circles' },
    ],
  },
  '/ko/community': {
    lang: 'ko',
    section: 'go-further',
    title: 'Community',
    reads: [
      { table: 'communities', drives: 'the circles grid' },
      { table: 'news', feed: 'community', drives: 'the news grid below the circles' },
    ],
  },
  '/zh-tw/community': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'Community',
    reads: [
      { table: 'communities', drives: 'the circles grid' },
      { table: 'news', feed: 'community', drives: 'the news grid below the circles' },
    ],
  },
  '/community/:slug': { lang: 'en', section: 'go-further', title: 'Community detail' },
  '/ko/community/:slug': { lang: 'ko', section: 'go-further', title: 'Community detail' },
  '/community/all': {
    lang: 'en',
    section: 'go-further',
    title: 'Community index',
    reads: [
      { table: 'communities', drives: 'the directory — every circle, with the line that says where it stands' },
    ],
  },
  '/ko/community/all': {
    lang: 'ko',
    section: 'go-further',
    title: 'Community index',
    reads: [
      { table: 'communities', drives: 'the directory — every circle, with the line that says where it stands' },
    ],
  },
  '/zh-tw/community/all': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'Community index',
    reads: [
      { table: 'communities', drives: 'the directory — every circle, with the line that says where it stands' },
    ],
  },
  '/connect': {
    lang: 'en',
    section: 'connect',
    title: 'Are you IN?',
    writes: [
      { table: 'submissions', drives: 'the enquiry form' },
    ],
  },
  '/ko/connect': {
    lang: 'ko',
    section: 'connect',
    title: 'Are you IN?',
    writes: [
      { table: 'submissions', drives: 'the enquiry form' },
    ],
  },
  '/zh-tw/connect': {
    lang: 'zh-TW',
    section: 'connect',
    title: 'Are you IN?',
    writes: [
      { table: 'submissions', drives: 'the enquiry form' },
    ],
  },
  '/constellation': {
    lang: 'en',
    section: 'bigger-picture',
    title: 'Constellation',
    reads: [
      { table: 'constellation_points', drives: 'every light on the map, and both grouping modes' },
    ],
  },
  '/ko/constellation': {
    lang: 'ko',
    section: 'bigger-picture',
    title: 'Constellation',
    reads: [
      { table: 'constellation_points', drives: 'every light on the map, and both grouping modes' },
    ],
  },
  '/zh-tw/constellation': {
    lang: 'zh-TW',
    section: 'bigger-picture',
    title: 'Constellation',
    reads: [
      { table: 'constellation_points', drives: 'every light on the map, and both grouping modes' },
    ],
  },
  '/manifesto': { lang: 'en', section: 'bigger-picture', title: 'Manifesto' },
  '/ko/manifesto': { lang: 'ko', section: 'bigger-picture', title: 'Manifesto' },
  '/mewe': { lang: 'en', section: 'start-here', title: 'MEWE' },
  '/ko/mewe': { lang: 'ko', section: 'start-here', title: 'MEWE' },
  '/zh-tw/mewe': { lang: 'zh-TW', section: 'start-here', title: 'MEWE' },
  '/news': {
    lang: 'en',
    section: 'bigger-picture',
    title: 'News',
    reads: [
      { table: 'news', feed: 'news', drives: 'the whole card wall' },
    ],
  },
  '/ko/news': {
    lang: 'ko',
    section: 'bigger-picture',
    title: 'News',
    reads: [
      { table: 'news', feed: 'news', drives: 'the whole card wall' },
    ],
  },
  '/zh-tw/news': {
    lang: 'zh-TW',
    section: 'bigger-picture',
    title: 'News',
    reads: [
      { table: 'news', feed: 'news', drives: 'the whole card wall' },
    ],
  },
  '/pathway': { lang: 'en', section: 'go-further', title: 'Pathway' },
  '/ko/pathway': { lang: 'ko', section: 'go-further', title: 'Pathway' },
  '/zh-tw/pathway': { lang: 'zh-TW', section: 'go-further', title: 'Pathway' },
  '/people': {
    lang: 'en',
    section: 'bigger-picture',
    title: 'People',
    reads: [
      { table: 'collectives', drives: 'the roster, each bio expanding in place' },
    ],
  },
  '/ko/people': {
    lang: 'ko',
    section: 'bigger-picture',
    title: 'People',
    reads: [
      { table: 'collectives', drives: 'the roster, each bio expanding in place' },
    ],
  },
  '/zh-tw/people': {
    lang: 'zh-TW',
    section: 'bigger-picture',
    title: 'People',
    reads: [
      { table: 'collectives', drives: 'the roster, each bio expanding in place' },
    ],
  },
  '/project': {
    lang: 'en',
    section: 'go-further',
    title: 'Project index',
    reads: [
      { table: 'projects', drives: 'the wall of project briefs — every project but the one the page features' },
    ],
  },
  '/ko/project': {
    lang: 'ko',
    section: 'go-further',
    title: 'Project index',
    reads: [
      { table: 'projects', drives: 'the wall of project briefs — every project but the one the page features' },
    ],
  },
  '/project/:slug': {
    lang: 'en',
    section: 'go-further',
    title: 'Project detail',
    reads: [
      { table: 'projects', drives: 'the title, and the All projects rail beside the article' },
    ],
  },
  '/ko/project/:slug': {
    lang: 'ko',
    section: 'go-further',
    title: 'Project detail',
    reads: [
      { table: 'projects', drives: 'the title, and the All projects rail beside the article' },
    ],
  },
  '/project/asia-exchange': {
    lang: 'en',
    section: 'go-further',
    title: 'Asia Exchange',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/asia-exchange': {
    lang: 'ko',
    section: 'go-further',
    title: 'Asia Exchange',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/food-revolution': {
    lang: 'en',
    section: 'go-further',
    title: 'Food Revolution',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/food-revolution': {
    lang: 'ko',
    section: 'go-further',
    title: 'Food Revolution',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/food-revolution': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'Food Revolution',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/jungle-jam': {
    lang: 'en',
    section: 'go-further',
    title: 'Jungle Jam',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/jungle-jam': {
    lang: 'ko',
    section: 'go-further',
    title: 'Jungle Jam',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/jungle-jam': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'Jungle Jam',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/light-shadow-shift-womens-retreat': {
    lang: 'en',
    section: 'go-further',
    title: "Light Shadow Shift Women's Retreat",
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/light-shadow-shift-womens-retreat': {
    lang: 'ko',
    section: 'go-further',
    title: "Light Shadow Shift Women's Retreat",
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/light-shadow-shift-womens-retreat': {
    lang: 'zh-TW',
    section: 'go-further',
    title: "Light Shadow Shift Women's Retreat",
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/shadow-shifter': {
    lang: 'en',
    section: 'go-further',
    title: 'Shadow Shifter',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/shadow-shifter': {
    lang: 'ko',
    section: 'go-further',
    title: 'Shadow Shifter',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/shadow-shifter': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'Shadow Shifter',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/uae-youth-social-innovation': {
    lang: 'en',
    section: 'go-further',
    title: 'UAE Youth Social Innovation',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/uae-youth-social-innovation': {
    lang: 'ko',
    section: 'go-further',
    title: 'UAE Youth Social Innovation',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/uae-youth-social-innovation': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'UAE Youth Social Innovation',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/unc': {
    lang: 'en',
    section: 'go-further',
    title: 'UNC',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/unc': {
    lang: 'ko',
    section: 'go-further',
    title: 'UNC',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/unc': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'UNC',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/unc-documentary': {
    lang: 'en',
    section: 'go-further',
    title: 'UNC Documentary',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/ko/project/unc-documentary': {
    lang: 'ko',
    section: 'go-further',
    title: 'UNC Documentary',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/zh-tw/project/unc-documentary': {
    lang: 'zh-TW',
    section: 'go-further',
    title: 'UNC Documentary',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/story': { lang: 'en', section: 'start-here', title: 'Story' },
  '/ko/story': { lang: 'ko', section: 'start-here', title: 'Story' },
  '/story/all': {
    lang: 'en',
    section: 'start-here',
    title: 'Story index',
    reads: [
      { table: 'story_entries', drives: 'every story, its filters and its reading pane' },
    ],
  },
  '/ko/story/all': {
    lang: 'ko',
    section: 'start-here',
    title: 'Story index',
    reads: [
      { table: 'story_entries', drives: 'every story, its filters and its reading pane' },
    ],
  },
  '/zh-tw/story/all': {
    lang: 'zh-TW',
    section: 'start-here',
    title: 'Story index',
    reads: [
      { table: 'story_entries', drives: 'every story, its filters and its reading pane' },
    ],
  },
  '/story/submit': {
    lang: 'en',
    section: 'start-here',
    title: 'Story submission',
    writes: [
      { table: 'stories', drives: 'the submission, and its attachment in the story-media bucket' },
    ],
  },
  '/ko/story/submit': {
    lang: 'ko',
    section: 'start-here',
    title: 'Story submission',
    writes: [
      { table: 'stories', drives: 'the submission, and its attachment in the story-media bucket' },
    ],
  },
  '/workshop': {
    lang: 'en',
    section: 'start-here',
    title: 'Workshop',
    reads: [
      { table: 'workshops', drives: 'the featured row, the card wall below it, and the audience filter chips' },
    ],
  },
  '/ko/workshop': {
    lang: 'ko',
    section: 'start-here',
    title: 'Workshop',
    reads: [
      { table: 'workshops', drives: 'the featured row, the card wall below it, and the audience filter chips' },
    ],
  },
  '/workshop/:slug': { lang: 'en', section: 'start-here', title: 'Workshop detail', writes: WORKSHOP_SIGNUP },
  '/ko/workshop/:slug': { lang: 'ko', section: 'start-here', title: 'Workshop detail', writes: WORKSHOP_SIGNUP },
  '/workshop/bucket-list': { lang: 'en', section: 'start-here', title: 'Bucket List', writes: WORKSHOP_SIGNUP },
  '/ko/workshop/bucket-list': { lang: 'ko', section: 'start-here', title: 'Bucket List', writes: WORKSHOP_SIGNUP },
  '/zh-tw/workshop/bucket-list': { lang: 'zh-TW', section: 'start-here', title: 'Bucket List', writes: WORKSHOP_SIGNUP },
  '/workshop/jungle-jam': { lang: 'en', section: 'start-here', title: 'Jungle Jam', writes: WORKSHOP_SIGNUP },
  '/ko/workshop/jungle-jam': { lang: 'ko', section: 'start-here', title: 'Jungle Jam', writes: WORKSHOP_SIGNUP },
  '/zh-tw/workshop/jungle-jam': { lang: 'zh-TW', section: 'start-here', title: 'Jungle Jam', writes: WORKSHOP_SIGNUP },
  '/workshop/light-shadow-shift': {
    lang: 'en',
    section: 'start-here',
    title: 'Light Shadow Shift',
    writes: WORKSHOP_SIGNUP,
  },
  '/ko/workshop/light-shadow-shift': {
    lang: 'ko',
    section: 'start-here',
    title: 'Light Shadow Shift',
    writes: WORKSHOP_SIGNUP,
  },
  '/zh-tw/workshop/light-shadow-shift': {
    lang: 'zh-TW',
    section: 'start-here',
    title: 'Light Shadow Shift',
    writes: WORKSHOP_SIGNUP,
  },
  '/workshop/pathfinder': { lang: 'en', section: 'start-here', title: 'Pathfinder', writes: WORKSHOP_SIGNUP },
  '/ko/workshop/pathfinder': { lang: 'ko', section: 'start-here', title: 'Pathfinder', writes: WORKSHOP_SIGNUP },
  '/zh-tw/workshop/pathfinder': { lang: 'zh-TW', section: 'start-here', title: 'Pathfinder', writes: WORKSHOP_SIGNUP },
  '/workshop/second-life': { lang: 'en', section: 'start-here', title: 'Second Life', writes: WORKSHOP_SIGNUP },
  '/ko/workshop/second-life': { lang: 'ko', section: 'start-here', title: 'Second Life', writes: WORKSHOP_SIGNUP },
  '/zh-tw/workshop/second-life': { lang: 'zh-TW', section: 'start-here', title: 'Second Life', writes: WORKSHOP_SIGNUP },
  '/workshop/shadow-shifter': { lang: 'en', section: 'start-here', title: 'Shadow Shifter', writes: WORKSHOP_SIGNUP },
  '/ko/workshop/shadow-shifter': { lang: 'ko', section: 'start-here', title: 'Shadow Shifter', writes: WORKSHOP_SIGNUP },
  '/zh-tw/workshop/shadow-shifter': { lang: 'zh-TW', section: 'start-here', title: 'Shadow Shifter', writes: WORKSHOP_SIGNUP },
};

/**
 * The model key a path is served by.
 *
 * Exact first, then the `:slug` patterns — the same order React Router ranks
 * its routes in, so `/project/asia-exchange` resolves to its own entry and
 * `/project/ctn` to the template's. Iterated on call rather than indexed at
 * module scope: this file is meant to be droppable from a production build,
 * and a map built up front is work the bundler cannot see is dead.
 */
function keyFor(route: string): string | undefined {
  if (PAGE_MODELS[route]) return route;

  const parts = route.split('/');
  return Object.keys(PAGE_MODELS).find((key) => {
    if (!key.includes(':')) return false;
    const pattern = key.split('/');
    if (pattern.length !== parts.length) return false;
    return pattern.every((segment, i) => segment.startsWith(':') || segment === parts[i]);
  });
}

export function modelFor(route: string): PageModel | undefined {
  const key = keyFor(route);
  return key ? PAGE_MODELS[key] : undefined;
}

/**
 * The tables a route reads.
 *
 * Reads only. A form's table is written and never read back, so a subscription
 * to `submissions` would hold a socket open for changes the anon key cannot see.
 */
export function tablesFor(route: string): ContentTable[] {
  const reads = modelFor(route)?.reads ?? [];
  return [...new Set(reads.map((read) => read.table))];
}
