import { useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from './route-map';
import { builderPaths } from '../builder/routes';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_PREFIX,
  normalizeLocale,
  type Locale,
} from '../i18n/locales';

/**
 * Locale, as this site addresses it: a path, not a preference.
 *
 * `/news` is English, `/ko/news` is Korean, `/zh-tw/news` is Traditional
 * Chinese. Nothing else decides — no cookie, no header, no state. A saved
 * preference only chooses which URL you land on when you arrive without one.
 *
 * The other half of the file is about pages that exist in some languages and
 * not others, which is most of them. Every answer here degrades towards the
 * default locale rather than towards a hole or a dead end.
 */

export type { Locale };

const STORAGE_KEY = 'in.locale';

/** The root path of a locale: `/` for the unprefixed default, `/ko` otherwise. */
export function localeHome(locale: Locale): string {
  const prefix = LOCALE_PREFIX[locale];
  return prefix ? `/${prefix}` : '/';
}

/**
 * Split a path into the locale it names and the path underneath.
 *
 * Accepts spellings the site does not itself emit — `/en/news`, `/zh-Hant/news`
 * — so an inbound link written the other way still resolves. The router
 * redirects those to the canonical spelling rather than serving both.
 */
export function stripLocale(pathname: string): { locale: Locale | null; path: string } {
  const [, first = '', ...rest] = pathname.split('/');
  const matched = normalizeLocale(first);
  if (!matched) return { locale: null, path: pathname || '/' };
  const path = rest.length ? `/${rest.join('/')}` : '/';
  return { locale: matched, path };
}

/** The locale a path is written in. */
export function localeOf(pathname: string): Locale {
  return stripLocale(pathname).locale ?? DEFAULT_LOCALE;
}

/** The same address in another locale — whether or not a page lives there. */
export function pathIn(pathname: string, locale: Locale): string {
  const { path } = stripLocale(pathname);
  const prefix = LOCALE_PREFIX[locale];
  if (!prefix) return path;
  return path === '/' ? `/${prefix}` : `/${prefix}${path}`;
}

/** True when a path is already spelled the way this locale's URLs are spelled. */
export function isCanonicalPath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  return pathIn(trimmed, localeOf(trimmed)) === trimmed;
}

/**
 * Whether a concrete path resolves to a page.
 *
 * The router's ranking in miniature: a literal route first, then a `:param`
 * pattern of the same shape. A pattern match is weaker evidence than a literal
 * one — a template can still render its own not-found for a slug it has no
 * copy for — but it is the same evidence the router acts on.
 */
export function isRoute(path: string): boolean {
  if (ROUTE_PATHS.includes(path)) return true;
  // Builder pages are data, so they are not in the generated table. The
  // language switcher has to see them or Traditional Chinese looks empty.
  if (builderPaths().includes(path)) return true;
  const segments = path.split('/');
  return ROUTE_PATHS.some((pattern) => {
    const parts = pattern.split('/');
    return (
      parts.length === segments.length &&
      parts.every((part, i) => (part.startsWith(':') ? segments[i] !== '' : part === segments[i]))
    );
  });
}

/**
 * A link target, in the locale of the page rendering it.
 *
 * The card walls all build default-locale paths, because that is what the
 * `route` column holds. On a Korean page that is right for a project — no
 * Korean brief exists — and wrong for a workshop, where all ten have a Korean
 * twin. So the rule is neither "always prefix" nor "never": take the twin
 * where there is one, keep the default where there is not.
 *
 * External URLs and anchors are returned untouched.
 */
export function localize(path: string | null | undefined, locale: Locale): string {
  if (!path || !path.startsWith('/')) return path ?? '';
  const target = pathIn(path, locale);
  return isRoute(target) ? target : path;
}

export interface Alternate {
  locale: Locale;
  /** Where the switcher goes for this locale. */
  to: string;
  /** True when that is the same page. False means the nearest thing above it. */
  exact: boolean;
  /** False when the locale has nothing to offer at all — the switch is dead. */
  available: boolean;
}

/**
 * Where the language switcher should land for one locale, and how close it gets.
 *
 * Most of the site exists in English only — every project brief, the community
 * pages, `/story/submit`. Sending all of those to the locale's home page reads
 * as the site losing your place rather than as the page not existing, so this
 * gives up a segment at a time instead: the same page if it exists, else the
 * section above it (`/project/food-revolution` becomes `/ko/project`), and the
 * home page only when there is nothing in between.
 *
 * `exact` is false for both of the latter so the switcher can say so, and
 * `available` is false when even the locale's home is not a route — which is
 * where Traditional Chinese starts, having no pages of its own yet.
 */
export function alternateFor(pathname: string, locale: Locale): Alternate {
  const to = pathIn(pathname, locale);
  if (isRoute(to)) return { locale, to, exact: true, available: true };

  const home = localeHome(locale);
  let up = to;
  for (;;) {
    const cut = up.lastIndexOf('/');
    if (cut <= 0) break;
    up = up.slice(0, cut);
    if (up.length < home.length) break;
    if (isRoute(up)) return { locale, to: up, exact: false, available: true };
  }
  return { locale, to: home, exact: false, available: isRoute(home) };
}

/** Every locale's answer for this path, in declaration order. */
export function alternates(pathname: string): Alternate[] {
  return LOCALES.map((locale) => alternateFor(pathname, locale));
}

/* ------------------------------------------------------------------ hooks */

/** The locale of the page being rendered. */
export function useLocale(): Locale {
  return localeOf(useLocation().pathname);
}

/**
 * The locale for a component: what it was told, else what the route says.
 *
 * The card components used to default to English, so the cost of a page
 * forgetting to pass one down was English copy inside a Korean page and no
 * complaint from anywhere. Defaulting to the route makes forgetting harmless.
 */
export function useLocaleOr(given?: Locale): Locale {
  const fromRoute = useLocale();
  return given ?? fromRoute;
}

/* ------------------------------------------------------- stored preference */

/**
 * The locale to use when someone arrives without one in the URL.
 *
 * URL, then saved preference, then browser, then the default. The URL half is
 * the router's job; this is the rest of the chain. Every read is wrapped
 * because a browser with site data blocked throws on `localStorage` rather
 * than returning null.
 */
export function readStoredLocale(): Locale | null {
  try {
    return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* Private window, or site data blocked. The URL still carries the locale. */
  }
}

/** The first browser language the site actually speaks. */
export function browserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null;
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    if (!tag) continue;
    const matched = normalizeLocale(tag) ?? normalizeLocale(tag.split('-')[0]);
    if (matched) return matched;
  }
  return null;
}

export function preferredLocale(): Locale {
  return readStoredLocale() ?? browserLocale() ?? DEFAULT_LOCALE;
}
