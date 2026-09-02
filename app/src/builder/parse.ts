import { isLocale, type Locale } from '../i18n/locales';
import type { BuilderPage, LocalePageData, PageDocument } from './types';

/**
 * Reading a stored page into the type system.
 *
 * A JSON import, a database row and an API response all arrive as `unknown`,
 * and the only honest way to call one a `BuilderPage` is to have looked. This
 * checks the shape and nothing else — element types are the registry's
 * business, and checking them here would make every module that loads a page
 * depend on every component that can render one.
 *
 * Structure only, so it stays a leaf: types and locales, no registry, no React.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDocument(value: unknown): value is PageDocument {
  return isObject(value) && Array.isArray(value.nodes);
}

function isLocaleData(value: unknown): value is LocalePageData {
  if (!isObject(value)) return false;
  if (typeof value.slug !== 'string') return false;
  if (value.status !== 'draft' && value.status !== 'published') return false;
  if (!isObject(value.seo)) return false;
  if (!isObject(value.content)) return false;
  if (value.documentOverride !== undefined && !isDocument(value.documentOverride)) return false;
  return true;
}

/** A stored page, or null with a reason. Never throws on bad input. */
export function parseBuilderPage(raw: unknown): BuilderPage | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.routeKey !== 'string' || !raw.routeKey) return null;
  if (!isLocale(raw.defaultLocale)) return null;
  if (!isDocument(raw.sharedDocument)) return null;
  if (!isObject(raw.locales)) return null;

  const locales: Partial<Record<Locale, LocalePageData>> = {};
  for (const [key, value] of Object.entries(raw.locales)) {
    // A locale key the build does not know is dropped rather than rejected:
    // a page saved after a fourth language was added should still render in
    // the three this build speaks.
    if (!isLocale(key) || !isLocaleData(value)) continue;
    locales[key] = value;
  }
  if (!locales[raw.defaultLocale]) return null;

  return {
    id: raw.id,
    routeKey: raw.routeKey,
    defaultLocale: raw.defaultLocale,
    sharedDocument: raw.sharedDocument,
    locales,
  };
}

/**
 * The same, for a page that is part of the build.
 *
 * A bundled page failing to parse is a broken build, not a bad request, so it
 * is loud in development and skipped in production — a malformed page should
 * cost that page, not the site.
 */
export function parseBundledPage(raw: unknown, name: string): BuilderPage | null {
  const page = parseBuilderPage(raw);
  if (!page && import.meta.env.DEV) {
    throw new Error(
      `[IN] src/builder/pages/${name}.json is not a valid page. ` +
        'Re-run: node scripts/migrate-builder-page.mjs',
    );
  }
  return page;
}
