import type { Locale } from '../i18n/locales';
import { requiredLocalizedFields } from './registry';
import type {
  BuilderNode,
  BuilderPage,
  Json,
  LocalePageData,
  LocalizedSEO,
  PageDocument,
} from './types';

/**
 * Working out what a page says, and in which language it ended up saying it.
 *
 * The rule is: the requested locale, then the page's default locale, then
 * nothing. Applied field by field rather than record by record, because a page
 * whose heading is translated and whose caption is not should show the
 * translated heading — reverting the whole page to English the moment one
 * field is missing is how translations stop getting finished.
 *
 * Every fallback is *recorded*, not just applied. The editor needs to show
 * which values it is displaying from another language so nobody mistakes a
 * fallback for a finished translation, and nothing here ever writes a fallback
 * value back into the locale it was borrowed for.
 */

/** A value counts as translated only if someone actually put something there. */
export function hasValue(value: Json | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export interface ResolvedPage {
  locale: Locale;
  /** The requested locale's record, if the page has been started in it. */
  data: LocalePageData | null;
  /** Where borrowed values came from, or null if nothing was borrowed. */
  fallbackLocale: Locale | null;
  /** Binding key → value, requested locale winning over the default. */
  content: Record<string, Json>;
  /** Binding keys whose value was borrowed from the fallback locale. */
  fallbackKeys: ReadonlySet<string>;
  /** Title and description, with the same field-by-field fallback. */
  seo: LocalizedSEO;
  /** True when any SEO field was borrowed rather than written for this locale. */
  seoIsFallback: boolean;
  /** The element tree to render: this locale's override, or the shared one. */
  document: PageDocument;
  /** True when this locale has diverged from the shared layout. */
  usesOverride: boolean;
}

/** The first of two strings that anyone actually wrote. */
function pick(own: string | undefined, fallback: string | undefined): string {
  if (hasValue(own)) return own as string;
  if (hasValue(fallback)) return fallback as string;
  return '';
}

export function resolvePage(page: BuilderPage, locale: Locale): ResolvedPage {
  const requested = page.locales[locale] ?? null;
  const fallback = page.locales[page.defaultLocale] ?? null;

  const content: Record<string, Json> = {};
  const fallbackKeys = new Set<string>();

  // The default locale lays the floor…
  if (fallback && locale !== page.defaultLocale) {
    for (const [key, value] of Object.entries(fallback.content)) {
      if (!hasValue(value)) continue;
      content[key] = value;
      fallbackKeys.add(key);
    }
  }

  // …and the requested locale covers whatever it has actually translated. A
  // key left blank in this locale is untranslated, not deliberately empty, so
  // it keeps the floor rather than punching a hole in it.
  const own = requested ?? (locale === page.defaultLocale ? fallback : null);
  if (own) {
    for (const [key, value] of Object.entries(own.content)) {
      if (!hasValue(value)) continue;
      content[key] = value;
      fallbackKeys.delete(key);
    }
  }

  const seoSource = requested?.seo;
  const seoFallback = fallback?.seo;
  const seo: LocalizedSEO = {
    title: pick(seoSource?.title, seoFallback?.title),
    description: pick(seoSource?.description, seoFallback?.description),
  };
  const ogImage = pick(seoSource?.openGraphImage, seoFallback?.openGraphImage);
  if (ogImage) seo.openGraphImage = ogImage;

  const seoIsFallback =
    (!hasValue(seoSource?.title) && hasValue(seoFallback?.title)) ||
    (!hasValue(seoSource?.description) && hasValue(seoFallback?.description));

  return {
    locale,
    data: requested,
    fallbackLocale: fallbackKeys.size > 0 || seoIsFallback ? page.defaultLocale : null,
    seo,
    seoIsFallback,
    content,
    fallbackKeys,
    document: requested?.documentOverride ?? page.sharedDocument,
    usesOverride: Boolean(requested?.documentOverride),
  };
}

/**
 * A node's props with its bindings filled in from the resolved content.
 *
 * A bound prop takes the localized value and ignores whatever sits in `props`,
 * so a shared tree carrying a stale English string cannot leak into another
 * language. An unresolved binding yields no prop at all rather than the key
 * name, which would otherwise render as `hero.title` on the page.
 */
export function resolveNodeProps(
  node: BuilderNode,
  content: Record<string, Json>,
): Record<string, Json> {
  if (!node.bindings) return node.props;

  const resolved: Record<string, Json> = { ...node.props };
  for (const [prop, key] of Object.entries(node.bindings)) {
    const value = content[key];
    if (hasValue(value)) resolved[prop] = value;
    else delete resolved[prop];
  }
  return resolved;
}

/** Every node in a document, parents before children. */
export function walk(document: PageDocument): BuilderNode[] {
  const out: BuilderNode[] = [];
  const visit = (nodes: BuilderNode[]) => {
    for (const node of nodes) {
      out.push(node);
      if (node.children?.length) visit(node.children);
    }
  };
  visit(document.nodes);
  return out;
}

export interface TranslationProgress {
  /** Binding keys this document needs filled in for a locale to be finished. */
  required: string[];
  /** Of those, the ones this locale has not translated. */
  missing: string[];
  /** Of those, the ones currently being shown from the fallback locale. */
  borrowed: string[];
  complete: boolean;
  /** True when the page has not been started in this locale at all. */
  untouched: boolean;
}

/**
 * How far along a locale is.
 *
 * Counted from the element registry rather than from whatever keys happen to
 * be in the content record: the question is "what does this page ask an
 * editor for", and only the schema knows. Optional fields — a link, an image
 * — are not counted, because leaving them shared is a legitimate finished
 * state rather than an unfinished one.
 */
export function translationProgress(
  page: BuilderPage,
  locale: Locale,
  resolved = resolvePage(page, locale),
): TranslationProgress {
  const own = page.locales[locale];
  const required: string[] = [];

  for (const node of walk(resolved.document)) {
    if (!node.bindings) continue;
    for (const field of requiredLocalizedFields(node.type)) {
      const key = node.bindings[field];
      if (key) required.push(key);
    }
  }

  const unique = [...new Set(required)];
  const missing = unique.filter((key) => !hasValue(own?.content[key]));
  const borrowed = missing.filter((key) => resolved.fallbackKeys.has(key));

  return {
    required: unique,
    missing,
    borrowed,
    complete: missing.length === 0,
    untouched: !own,
  };
}
