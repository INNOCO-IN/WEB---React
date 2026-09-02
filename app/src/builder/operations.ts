import { DEFAULT_LOCALE, type Locale } from '../i18n/locales';
import type { BuilderPage, Json, LocalePageData, PageDocument, PublishStatus } from './types';

/**
 * Editing operations, as pure functions.
 *
 * Every one takes a page and returns a new page. Nothing here mutates its
 * input, which is the property that makes "customize this language's layout"
 * safe: the shared document has to survive being copied, and an operation that
 * edited it in place would silently change every other language at the same
 * time.
 *
 * They are separate from the toolbar that calls them so they can be tested
 * without a DOM, and so a different editor — or an API endpoint — applies
 * exactly the same rules.
 */

/**
 * A page document is JSON by construction, so a round trip is a complete deep
 * copy. Element ids come through unchanged, which is the point: a locale's own
 * layout has to stay matched to the translations already written against those
 * ids.
 */
function cloneDocument(document: PageDocument): PageDocument {
  return JSON.parse(JSON.stringify(document)) as PageDocument;
}

/** An empty record for a language nobody has started. Never pre-filled. */
export function emptyLocaleData(slug: string): LocalePageData {
  return {
    slug,
    status: 'draft',
    seo: { title: '', description: '' },
    content: {},
  };
}

function withLocale(
  page: BuilderPage,
  locale: Locale,
  update: (data: LocalePageData) => LocalePageData,
): BuilderPage {
  const fallbackSlug =
    page.locales[locale]?.slug ?? page.locales[page.defaultLocale]?.slug ?? page.routeKey;
  const current = page.locales[locale] ?? emptyLocaleData(fallbackSlug);
  return { ...page, locales: { ...page.locales, [locale]: update(current) } };
}

/**
 * Give one language its own copy of the element tree.
 *
 * The shared document is cloned as a starting point rather than emptied, so
 * the page keeps looking like itself while the divergence is made. From here
 * on, shared-layout edits stop reaching this locale — which is exactly what
 * was asked for, and exactly why the toolbar says so before doing it.
 */
export function customizeLayoutForLocale(page: BuilderPage, locale: Locale): BuilderPage {
  if (page.locales[locale]?.documentOverride) return page;
  return withLocale(page, locale, (data) => ({
    ...data,
    documentOverride: cloneDocument(page.sharedDocument),
  }));
}

/**
 * Put one language back on the shared layout.
 *
 * Removes the override and nothing else. The locale's text, SEO, slug and
 * publish status are untouched, because losing a translation is not what
 * anybody means by "return to the shared layout".
 */
export function returnToSharedLayout(page: BuilderPage, locale: Locale): BuilderPage {
  const data = page.locales[locale];
  if (!data?.documentOverride) return page;
  const { documentOverride: _removed, ...kept } = data;
  return { ...page, locales: { ...page.locales, [locale]: kept } };
}

/**
 * Write one translated value.
 *
 * Scoped to one locale's content record by construction — there is no path
 * through this function that reaches another language, which is what stops an
 * editor changing Korean while they are looking at Chinese.
 */
export function setLocaleValue(
  page: BuilderPage,
  locale: Locale,
  key: string,
  value: Json,
): BuilderPage {
  return withLocale(page, locale, (data) => ({
    ...data,
    content: { ...data.content, [key]: value },
  }));
}

/** Clear one translated value, so the page falls back rather than showing blank. */
export function clearLocaleValue(page: BuilderPage, locale: Locale, key: string): BuilderPage {
  const data = page.locales[locale];
  if (!data || !(key in data.content)) return page;
  const { [key]: _removed, ...content } = data.content;
  return { ...page, locales: { ...page.locales, [locale]: { ...data, content } } };
}

export function setLocaleStatus(
  page: BuilderPage,
  locale: Locale,
  status: PublishStatus,
): BuilderPage {
  return withLocale(page, locale, (data) => ({ ...data, status }));
}

export function setLocaleSlug(page: BuilderPage, locale: Locale, slug: string): BuilderPage {
  return withLocale(page, locale, (data) => ({ ...data, slug }));
}

export function setLocaleSeo(
  page: BuilderPage,
  locale: Locale,
  seo: Partial<LocalePageData['seo']>,
): BuilderPage {
  return withLocale(page, locale, (data) => ({ ...data, seo: { ...data.seo, ...seo } }));
}

/**
 * Edit the shared element tree.
 *
 * Named for what it costs: every locale without an override renders this, so
 * it is the one operation whose blast radius is the whole page in every
 * language. The toolbar says so before it is used.
 */
export function setSharedDocument(page: BuilderPage, document: PageDocument): BuilderPage {
  return { ...page, sharedDocument: document };
}

/** A page with nothing in it, for a routeKey that has just been created. */
export function createPage(id: string, routeKey: string, slug = routeKey): BuilderPage {
  return {
    id,
    routeKey,
    defaultLocale: DEFAULT_LOCALE,
    sharedDocument: { nodes: [] },
    locales: { [DEFAULT_LOCALE]: emptyLocaleData(slug) },
  };
}
