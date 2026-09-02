import { LOCALES, LOCALE_PREFIX, type Locale } from '../i18n/locales';
import newsPage from './pages/news.json';
import { parseBundledPage } from './parse';
import type { BuilderPage } from './types';

/**
 * Which addresses the builder answers for.
 *
 * A page is served by the builder only if its routeKey is listed in
 * `BUILDER_SERVES`, and even then a converted page wins: React Router ranks a
 * literal route above the catch-all, so `/news` and `/ko/news` keep reaching
 * their existing components and only `/zh-tw/news` — which has no component —
 * falls through to here.
 *
 * That is the migration path, and it is reversible in both directions. To hand
 * a page to the builder for real, remove it from the converter's input the way
 * the `:slug` templates did; to hand it back, take its routeKey out of the
 * list. Nothing is deleted either way.
 */

/**
 * The bundled pages, exactly as `scripts/migrate-builder-page.mjs` wrote them.
 *
 * Parsed rather than cast: a JSON import is `unknown` shaped like a page, and
 * the only honest way to call it one is to check. It also means a hand-edited
 * page file fails at startup in development instead of halfway down a render.
 */
export const BUILDER_PAGES: BuilderPage[] = [parseBundledPage(newsPage, 'news')].filter(
  (page): page is BuilderPage => page !== null,
);

/**
 * routeKeys the builder is allowed to serve.
 *
 * `news` is the one migrated page. Its English and Korean addresses are still
 * held by the converted components, so what this actually lights up today is
 * `/zh-tw/news` — a language the static site never had, rendering the shared
 * layout with its text falling back to English.
 */
export const BUILDER_SERVES: readonly string[] = ['news'];

function served(): BuilderPage[] {
  return BUILDER_PAGES.filter((page) => BUILDER_SERVES.includes(page.routeKey));
}

function withPrefix(locale: Locale, slug: string): string {
  const prefix = LOCALE_PREFIX[locale];
  return prefix ? `/${prefix}/${slug}` : `/${slug}`;
}

/**
 * The address of one page in one locale.
 *
 * The slug is localized, so this is not simply the routeKey with a prefix —
 * a language may name the same page differently. A locale with no record of
 * its own borrows the default locale's slug, which is what keeps the page
 * reachable in a language nobody has started translating yet.
 */
export function pathForPage(page: BuilderPage, locale: Locale): string {
  const slug = page.locales[locale]?.slug ?? page.locales[page.defaultLocale]?.slug ?? page.routeKey;
  return withPrefix(locale, slug);
}

/** Every address the builder can answer, for the router's `isRoute` check. */
export function builderPaths(): string[] {
  return served().flatMap((page) => LOCALES.map((locale) => pathForPage(page, locale)));
}

export interface BuilderMatch {
  page: BuilderPage;
  locale: Locale;
}

/** The page and locale a pathname names, or null if the builder has neither. */
export function matchBuilderPath(pathname: string): BuilderMatch | null {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  for (const page of served()) {
    for (const locale of LOCALES) {
      if (pathForPage(page, locale) === trimmed) return { page, locale };
    }
  }
  return null;
}

export function pageByRouteKey(routeKey: string): BuilderPage | null {
  return BUILDER_PAGES.find((page) => page.routeKey === routeKey) ?? null;
}
