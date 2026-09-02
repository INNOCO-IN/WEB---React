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
 * the page renders its own copy, so the model says it reads nothing.
 */

export type Section = 'home' | 'start-within' | 'share-space' | 'serve-whole' | 'connect';

/** A table a page reads, and what its rows become on the page. */
export interface Reads {
  table: ContentTable;
  drives: string;
  /** For `news`, which of its feeds this page draws. */
  feed?: Feed;
}

/** A table a page writes to — the two forms. */
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
  '/manifesto': { lang: 'en', section: 'start-within', title: 'Manifesto' },
  '/ko/manifesto': { lang: 'ko', section: 'start-within', title: 'Manifesto' },
  '/collectives': {
    lang: 'en',
    section: 'start-within',
    title: 'Collectives',
    reads: [
      { table: 'collectives', drives: 'the roster, each bio expanding in place' },
    ],
  },
  '/ko/collectives': {
    lang: 'ko',
    section: 'start-within',
    title: 'Collectives',
    reads: [
      { table: 'collectives', drives: 'the roster, each bio expanding in place' },
    ],
  },
  '/mewe': { lang: 'en', section: 'start-within', title: 'MEWE' },
  '/ko/mewe': { lang: 'ko', section: 'start-within', title: 'MEWE' },
  '/action-research': { lang: 'en', section: 'start-within', title: 'Action Research' },
  '/workshop': {
    lang: 'en',
    section: 'share-space',
    title: 'Workshop',
    reads: [
      { table: 'workshops', drives: 'the featured row, the card wall below it, and the audience filter chips' },
    ],
  },
  '/ko/workshop': {
    lang: 'ko',
    section: 'share-space',
    title: 'Workshop',
    reads: [
      { table: 'workshops', drives: 'the featured row, the card wall below it, and the audience filter chips' },
    ],
  },
  /**
   * Hero's Journey, Metanoia, Möbius Making and Two Wings, in both languages.
   *
   * Eight pages of the same layout — see pages/templates/WorkshopDetail.tsx.
   * One entry serves both language routes because one component does: the
   * template reads the language off the path.
   *
   * It names no table, and the note at the top of this file explains why: the
   * `workshops` row behind each of these carries a title and a blurb for the
   * card wall, but the page's own eyebrow, lede and pills are written for the
   * page and say something different.
   */
  '/workshop/:slug': { lang: 'en', section: 'share-space', title: 'Workshop detail' },
  '/ko/workshop/:slug': { lang: 'ko', section: 'share-space', title: 'Workshop detail' },

  '/workshop/bucket-list': { lang: 'en', section: 'share-space', title: 'Bucket List' },
  '/ko/workshop/bucket-list': { lang: 'ko', section: 'share-space', title: 'Bucket List' },
  '/workshop/jungle-jam': { lang: 'en', section: 'share-space', title: 'Jungle Jam' },
  '/ko/workshop/jungle-jam': { lang: 'ko', section: 'share-space', title: 'Jungle Jam' },
  '/workshop/light-shadow-shift': {
    lang: 'en',
    section: 'share-space',
    title: 'Light Shadow Shift',
  },
  '/ko/workshop/light-shadow-shift': {
    lang: 'ko',
    section: 'share-space',
    title: 'Light Shadow Shift',
  },
  '/workshop/pathfinder': { lang: 'en', section: 'share-space', title: 'Pathfinder' },
  '/ko/workshop/pathfinder': { lang: 'ko', section: 'share-space', title: 'Pathfinder' },
  '/workshop/second-life': { lang: 'en', section: 'share-space', title: 'Second Life' },
  '/ko/workshop/second-life': { lang: 'ko', section: 'share-space', title: 'Second Life' },
  '/workshop/shadow-shifter': { lang: 'en', section: 'share-space', title: 'Shadow Shifter' },
  '/ko/workshop/shadow-shifter': { lang: 'ko', section: 'share-space', title: 'Shadow Shifter' },
  '/story': { lang: 'en', section: 'share-space', title: 'Story' },
  '/ko/story': { lang: 'ko', section: 'share-space', title: 'Story' },
  '/story/all': {
    lang: 'en',
    section: 'share-space',
    title: 'Story index',
    reads: [
      { table: 'story_entries', drives: 'every story, its filters and its reading pane' },
    ],
  },
  '/ko/story/all': {
    lang: 'ko',
    section: 'share-space',
    title: 'Story index',
    reads: [
      { table: 'story_entries', drives: 'every story, its filters and its reading pane' },
    ],
  },
  '/story/submit': {
    lang: 'en',
    section: 'share-space',
    title: 'Story submission',
    writes: [
      { table: 'stories', drives: 'the submission, and its attachment in the story-media bucket' },
    ],
  },
  '/story/this-is-us': { lang: 'en', section: 'share-space', title: 'This Is Us' },
  '/protagonist': { lang: 'en', section: 'share-space', title: 'Protagonist' },
  '/ko/protagonist': { lang: 'ko', section: 'share-space', title: 'Protagonist' },
  '/project': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Project index',
    reads: [
      { table: 'projects', drives: 'the wall of project briefs — every project but the one the page features' },
    ],
  },
  '/ko/project': {
    lang: 'ko',
    section: 'serve-whole',
    title: 'Project index',
    reads: [
      { table: 'projects', drives: 'the wall of project briefs — every project but the one the page features' },
    ],
  },
  '/project/asia-exchange': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Asia Exchange',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/food-revolution': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Food Revolution',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/jungle-jam': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Jungle Jam',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/light-shadow-shift-womens-retreat': {
    lang: 'en',
    section: 'serve-whole',
    title: "Light Shadow Shift Women's Retreat",
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/shadow-shifter': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Shadow Shifter',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/uae-youth-social-innovation': {
    lang: 'en',
    section: 'serve-whole',
    title: 'UAE Youth Social Innovation',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/unc-documentary': {
    lang: 'en',
    section: 'serve-whole',
    title: 'UNC Documentary',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  '/project/unc': {
    lang: 'en',
    section: 'serve-whole',
    title: 'UNC',
    reads: [
      { table: 'projects', drives: 'the All projects rail beside the article' },
    ],
  },
  /**
   * The five plainer project pages, which are one template now.
   *
   * BridgeBuilder Program, CTN, GYEM, I Grow Seed and tasmena were the same
   * page five times — see pages/templates/ProjectDetail.tsx. The model follows
   * the route rather than the page, so there is one entry, and it reads the
   * `projects` table twice over: once for the rail, and once for the title,
   * which the template now takes from the row rather than from its own copy.
   */
  '/project/:slug': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Project detail',
    reads: [
      { table: 'projects', drives: 'the title, and the All projects rail beside the article' },
    ],
  },
  '/community': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Community',
    reads: [
      { table: 'communities', drives: 'the circles grid' },
      { table: 'news', feed: 'community', drives: 'the news grid below the circles' },
    ],
  },
  '/ko/community': {
    lang: 'ko',
    section: 'serve-whole',
    title: 'Community',
    reads: [
      { table: 'communities', drives: 'the circles grid' },
      { table: 'news', feed: 'community', drives: 'the news grid below the circles' },
    ],
  },
  '/community/all': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Community index',
    reads: [
      { table: 'communities', drives: 'the directory — every circle, with the line that says where it stands' },
    ],
  },
  /**
   * The seven circle write-ups, which are one template now.
   *
   * Animators, BridgeBuilders, Facilitators, IN-Collectives, the two youth
   * clusters and Open Studio were the same page seven times — see
   * pages/templates/CommunityDetail.tsx. It reads no table: unlike the project
   * briefs, the title on the page is deliberately shorter than the one the
   * `communities` row carries for the directory, so reading the row would
   * overwrite it. The rest of the copy is only ever on the page.
   */
  '/community/:slug': { lang: 'en', section: 'serve-whole', title: 'Community detail' },
  '/constellation': {
    lang: 'en',
    section: 'serve-whole',
    title: 'Constellation',
    reads: [
      { table: 'constellation_points', drives: 'every light on the map, and both grouping modes' },
    ],
  },
  '/ko/constellation': {
    lang: 'ko',
    section: 'serve-whole',
    title: 'Constellation',
    reads: [
      { table: 'constellation_points', drives: 'every light on the map, and both grouping modes' },
    ],
  },
  '/news': {
    lang: 'en',
    section: 'serve-whole',
    title: 'News',
    reads: [
      { table: 'news', feed: 'news', drives: 'the whole card wall' },
    ],
  },
  '/ko/news': {
    lang: 'ko',
    section: 'serve-whole',
    title: 'News',
    reads: [
      { table: 'news', feed: 'news', drives: 'the whole card wall' },
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
