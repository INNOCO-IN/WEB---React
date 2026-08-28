/**
 * The shapes the site's editorial content takes.
 *
 * One type per table, shared by three things so they cannot drift: the
 * Supabase queries in lib/services, the bundled fallback rows in this folder,
 * and the card components that render them.
 *
 * `accent` is a design-token name (`magenta`, `tan`, `slate`) rather than a
 * hex value — the colour belongs to the design system, not to the row. A raw
 * hex still works if a piece of content genuinely needs one.
 */

/**
 * Every table the site talks to, by its name in Postgres.
 *
 * One list, so a page model, a realtime subscription and a query can never
 * name a table three slightly different ways.
 */
export type ContentTable =
  | 'news'
  | 'workshops'
  | 'projects'
  | 'communities'
  | 'collectives'
  | 'story_entries'
  | 'constellation_points'
  | 'stories'
  | 'submissions';

export type Status = 'draft' | 'live' | 'archived';

/** Which lists a news item appears in. */
export type Feed = 'home' | 'news' | 'community' | 'story' | 'project';

export interface NewsItem {
  id: string;
  /** ISO date — the date the item is *about*, not when the row was written. */
  published_at: string | null;
  feeds: Feed[] | string[];
  /** Card label: Upcoming, Milestone, Recap, Launch, Press, … */
  kind: string | null;
  /** Small line above the title — usually a place, sometimes a cadence. */
  eyebrow: string | null;
  title: string;
  body: string | null;
  image: string | null;
  accent: string | null;
  /** Internal route or external URL. Null renders the card unlinked. */
  link: string | null;
  credit: string | null;
  credit_href: string | null;
  status: Status | string;
}

export interface WorkshopCard {
  slug: string;
  title: string;
  eyebrow: string | null;
  blurb: string | null;
  /** Drives the filter chips: For All, Parents, Organizations, Youth, Women. */
  audience: string | null;
  duration: string | null;
  accent: string | null;
  /** Whether the card's text sits as paper-on-colour or ink-on-colour. */
  ink: 'ink' | 'paper' | string;
  route: string | null;
  featured: boolean;
  cta: string | null;
  sort_order: number;
  active: boolean;
}

export interface ProjectCard {
  slug: string;
  title: string;
  title_ko: string | null;
  /** The short line the index rail shows under the title. */
  meta: string | null;
  eyebrow: string | null;
  eyebrow_ko: string | null;
  body: string | null;
  body_ko: string | null;
  image: string | null;
  accent: string | null;
  route: string | null;
  started_on: string | null;
  /** The one project the index page gives its own block to, above the wall. */
  featured: boolean;
  sort_order: number;
  status: Status | string;
}

export interface CommunityCard {
  slug: string;
  title: string;
  title_ko: string | null;
  /** Where the circle stands: 'Online · Resuming soon', 'On hold · Archive'. */
  meta: string | null;
  meta_ko: string | null;
  eyebrow: string | null;
  eyebrow_ko: string | null;
  body: string | null;
  body_ko: string | null;
  image: string | null;
  accent: string | null;
  route: string | null;
  sort_order: number;
  status: Status | string;
}

/** A story as the public site sees it — only ever the published ones. */
export interface PublishedStory {
  id: string;
  created_at: string;
  door: string | null;
  body: string;
  format: string[] | null;
  arc_stage: string | null;
  credit_name: string | null;
  attachment_url: string | null;
}

/** Token name → CSS custom property, with a hex passed straight through. */
export function accentColor(accent: string | null | undefined, fallback = 'var(--color-teal)'): string {
  if (!accent) return fallback;
  if (accent.startsWith('#') || accent.startsWith('var(') || accent.startsWith('rgb')) return accent;
  return `var(--color-${accent})`;
}

/** The fields a row can carry twice — the same card, told in two languages. */
export interface Bilingual {
  title: string;
  title_ko?: string | null;
  meta?: string | null;
  meta_ko?: string | null;
  eyebrow?: string | null;
  eyebrow_ko?: string | null;
  body?: string | null;
  body_ko?: string | null;
}

/** What a card shows, in one language. */
export interface Copy {
  title: string;
  meta: string | null;
  eyebrow: string | null;
  body: string | null;
}

/**
 * One row's copy in the language being read.
 *
 * Korean falls back to English field by field rather than row by row: a row
 * that has been given a Korean title but no Korean blurb should show the
 * Korean title and the English blurb, not revert the whole card to English. A
 * null Korean field means nobody has translated it yet, and English is a
 * better answer than a hole.
 *
 * This is what makes a card wall safe to translate incrementally in the Table
 * Editor — the alternative was the copy living in two page components, which
 * is how /ko/project came to hold Korean text no database row knew about.
 */
export function copyIn(row: Bilingual, lang: 'EN' | 'KO'): Copy {
  const ko = lang === 'KO';
  return {
    title: (ko ? row.title_ko : null) || row.title,
    meta: (ko ? row.meta_ko : null) || row.meta || null,
    eyebrow: (ko ? row.eyebrow_ko : null) || row.eyebrow || null,
    body: (ko ? row.body_ko : null) || row.body || null,
  };
}
