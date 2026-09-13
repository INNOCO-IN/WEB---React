import i18next from '../i18n';
import {
  HTML_LANG,
  LOCALES,
  OG_LOCALE,
  type Locale,
} from '../i18n/locales';
import { FOOTER_COLUMNS, NAV_GROUPS } from '../components/nav-data';
import { alternateFor, stripLocale } from './lang';

/**
 * What the document says about itself.
 *
 * A client-rendered site has to write its own head, and this one was not
 * writing any of it: one English title on every route, `lang="en"` baked into
 * index.html, no description, no canonical, and nothing marking a Korean page
 * as Korean. A crawler could not tell `/ko/manifesto` from `/manifesto`, and
 * neither could a browser choosing a font or a screen reader choosing a voice.
 *
 * This runs after hydration, so a crawler that does not execute JavaScript
 * still sees index.html's defaults. Prerendering is the fix for that, and this
 * is what prerendering would emit.
 */

/** Marks the tags this module owns, so a re-render replaces rather than piles up. */
const OWNED = 'data-in-head';

function upsert(selector: string, create: () => HTMLElement): HTMLElement {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute(OWNED, '');
  return element;
}

function meta(key: 'name' | 'property', value: string, content: string): void {
  upsert(`meta[${key}="${value}"]`, () => {
    const tag = document.createElement('meta');
    tag.setAttribute(key, value);
    return tag;
  }).setAttribute('content', content);
}

/**
 * Route → the section's own name, in one locale.
 *
 * Built from the nav rather than written twice: a section is named in exactly
 * one place, and adding one to the nav gives it a title for free. Routes are
 * indexed unprefixed, because the nav table is written that way and the lookup
 * strips the locale first.
 */
function sectionNames(locale: Locale): Record<string, string> {
  const t = i18next.getFixedT(locale, 'common');
  const names: Record<string, string> = {};
  for (const group of NAV_GROUPS) {
    for (const item of group.items) names[item.to] = t(`nav.items.${item.key}`);
  }
  for (const column of FOOTER_COLUMNS) {
    for (const link of column) names[link.to] ??= t(`nav.items.${link.key}`);
  }
  return names;
}

/**
 * The document title for a route, for pages that do not name their own —
 * which, before this, was every generated page on the site. All fifty-four of
 * them shared one English title, so a Korean page was announced in English to
 * every browser tab, bookmark and crawler that asked.
 *
 * A detail page inherits its section's name (`/workshop/pathfinder` is titled
 * Workshop) rather than falling all the way back to the brand line: the same
 * give-up-a-segment-at-a-time rule the language switcher uses.
 */
export function titleFor(pathname: string, locale: Locale): string {
  const t = i18next.getFixedT(locale, 'common');
  const names = sectionNames(locale);
  let path = stripLocale(pathname).path.replace(/\/+$/, '') || '/';

  for (;;) {
    const name = names[path];
    // 'Are you IN?' is already the brand — ' — IN' after it reads as a stutter.
    if (name) return name.includes('IN') ? name : `${name} — ${t('brand.name')}`;
    const cut = path.lastIndexOf('/');
    if (cut <= 0) break;
    path = path.slice(0, cut);
  }
  return t('brand.tagline');
}

export interface Head {
  pathname: string;
  locale: Locale;
  /** The page's own title, if it names one. */
  title?: string;
  description?: string;
}

export function syncHead({ pathname, locale, title, description }: Head): void {
  const t = i18next.getFixedT(locale, 'common');
  const resolvedTitle = title ?? titleFor(pathname, locale);
  const resolvedDescription = description ?? t('brand.description');
  const origin = window.location.origin;
  const url = origin + pathname;

  document.title = resolvedTitle;
  document.documentElement.lang = HTML_LANG[locale];

  meta('name', 'description', resolvedDescription);
  meta('property', 'og:title', resolvedTitle);
  meta('property', 'og:description', resolvedDescription);
  meta('property', 'og:url', url);
  meta('property', 'og:locale', OG_LOCALE[locale]);

  upsert('link[rel="canonical"]', () => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    return link;
  }).setAttribute('href', url);

  // hreflang has to be reciprocal and has to point at the *same* page, so only
  // locales with a real twin are listed. Pointing it at the section a page
  // falls back to — which is what the language switcher does — would tell a
  // search engine that a project brief and the project index are the same
  // document in two languages.
  for (const stale of document.head.querySelectorAll(`link[rel="alternate"][${OWNED}]`)) {
    stale.remove();
  }

  const twins = LOCALES.map((other) => ({ locale: other, alt: alternateFor(pathname, other) })).filter(
    ({ alt }) => alt.reach === 'page',
  );
  if (twins.length < 2) return;

  const addAlternate = (hreflang: string, path: string) => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', hreflang);
    link.setAttribute('href', origin + path);
    link.setAttribute(OWNED, '');
    document.head.appendChild(link);
  };

  for (const twin of twins) addAlternate(HTML_LANG[twin.locale], twin.alt.to);
  // x-default points at the default locale's copy where there is one, which is
  // what a search engine should offer someone whose language we do not speak.
  const fallback = twins.find((twin) => twin.locale === 'en') ?? twins[0];
  addAlternate('x-default', fallback.alt.to);
}

/** Sitemap rows for one path, one per locale that genuinely has the page. */
export function sitemapEntriesFor(pathname: string, origin: string): string[] {
  return LOCALES.map((locale) => alternateFor(pathname, locale))
    .filter((alt) => alt.reach === 'page')
    .map((alt) => origin + alt.to);
}
