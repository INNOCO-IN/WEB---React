import type { Locale } from '../../i18n/locales';

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
  | 'submissions'
  | 'workshop_registrations';

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
  /** Per-language copy, null until someone writes it. See `inLang`. */
  kind_ko?: string | null;
  eyebrow_ko?: string | null;
  title_ko?: string | null;
  body_ko?: string | null;
  kind_zh_tw?: string | null;
  eyebrow_zh_tw?: string | null;
  title_zh_tw?: string | null;
  body_zh_tw?: string | null;
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
  /**
   * Drives the filter chips: For All, Parents, Organizations, Youth, Women.
   * Stays English even on the Korean page — it is the grouping key, and
   * `audience_ko` is only what the chip is labelled.
   */
  audience: string | null;
  duration: string | null;
  /** Per-language copy, null until someone writes it. See `inLang`. */
  title_ko?: string | null;
  eyebrow_ko?: string | null;
  blurb_ko?: string | null;
  audience_ko?: string | null;
  duration_ko?: string | null;
  cta_ko?: string | null;
  title_zh_tw?: string | null;
  eyebrow_zh_tw?: string | null;
  blurb_zh_tw?: string | null;
  audience_zh_tw?: string | null;
  duration_zh_tw?: string | null;
  cta_zh_tw?: string | null;
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
  title_zh_tw?: string | null;
  eyebrow_zh_tw?: string | null;
  body_zh_tw?: string | null;
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
  title_zh_tw?: string | null;
  meta_zh_tw?: string | null;
  eyebrow_zh_tw?: string | null;
  body_zh_tw?: string | null;
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

/**
 * One field in the language being read, falling back to English.
 *
 * Field by field, not row by row: a row given a Korean title but no Korean
 * blurb should show the Korean title and the English blurb, not revert the
 * whole thing to English. A null Korean field means nobody has translated it
 * yet, and English is a better answer than a hole.
 *
 * This is the whole of the site's content fallback, and it is deliberately the
 * only rule — a page, a card and a rail reading the same row must not disagree
 * about when a translation counts as present.
 */
export function inLang(
  base: string | null | undefined,
  translations: Partial<Record<Locale, string | null | undefined>>,
  locale: Locale,
): string | null {
  return (translations[locale] || base) ?? null;
}

/** Token name → CSS custom property, with a hex passed straight through. */
export function accentColor(accent: string | null | undefined, fallback = 'var(--color-teal)'): string {
  if (!accent) return fallback;
  if (accent.startsWith('#') || accent.startsWith('var(') || accent.startsWith('rgb')) return accent;
  return `var(--color-${accent})`;
}

/**
 * The fields a row can carry once per language — the same card, told three ways.
 *
 * A column per language, which is the convention the projects and communities
 * tables already set. It does not scale past a handful of languages; the page
 * builder's per-locale content records are the shape to move these to when the
 * fourth language arrives.
 */
export interface Multilingual {
  title: string;
  title_ko?: string | null;
  title_zh_tw?: string | null;
  meta?: string | null;
  meta_ko?: string | null;
  meta_zh_tw?: string | null;
  eyebrow?: string | null;
  eyebrow_ko?: string | null;
  eyebrow_zh_tw?: string | null;
  body?: string | null;
  body_ko?: string | null;
  body_zh_tw?: string | null;
}

/** What a card shows, in one language. */
export interface Copy {
  title: string;
  meta: string | null;
  eyebrow: string | null;
  body: string | null;
}

/**
 * A card's four fields, in the language being read.
 *
 * `inLang` four times over — what makes a card wall safe to translate
 * incrementally in the Table Editor. The alternative was the copy living in
 * two page components, which is how /ko/project came to hold Korean text no
 * database row knew about.
 */
export function copyIn(row: Multilingual, locale: Locale): Copy {
  const at = (ko?: string | null, zh?: string | null) => ({ ko, 'zh-TW': zh });
  return {
    title: inLang(row.title, at(row.title_ko, row.title_zh_tw), locale) ?? row.title,
    meta: inLang(row.meta, at(row.meta_ko, row.meta_zh_tw), locale),
    eyebrow: inLang(row.eyebrow, at(row.eyebrow_ko, row.eyebrow_zh_tw), locale),
    body: inLang(row.body, at(row.body_ko, row.body_zh_tw), locale),
  };
}
