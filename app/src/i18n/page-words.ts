import { useTranslation } from 'react-i18next';
import i18next from './index';
import { LOCALES, type Locale } from './locales';
import type { PAGE_RESOURCES } from './resources/pages';

/**
 * The namespaces a collapsed page can claim.
 *
 * Type-only, so the generated index costs nothing at runtime while still
 * making `usePageWords('typo')` a compile error.
 */
export type PageNamespace = keyof (typeof PAGE_RESOURCES)['en'];

/**
 * A collapsed page's own words, registered when the page loads.
 *
 * The obvious thing — listing every page's words in the catalogue next to
 * `common` — puts all of them in the shell's chunk, which meant a hundred
 * kilobytes of copy on first paint with two thirds of it in languages the
 * reader is not reading. Registering per page instead keeps each page's words
 * in that page's own lazily-loaded chunk, where the rest of the page already
 * is.
 *
 * All three languages come with the page, not just the active one, so the
 * language switch stays instant and nothing has to be awaited mid-render.
 * That is a few kilobytes per page against a flash of missing text.
 */

export type PageBundles = Partial<Record<Locale, Record<string, string>>>;

const registered = new Set<PageNamespace>();

/**
 * Registration happens during render, which is a side effect — but an
 * idempotent, synchronous one against a module-level store. The alternative is
 * an effect, and an effect runs *after* the first paint, which is exactly the
 * frame where the words would be missing.
 */
export function usePageWords<N extends PageNamespace>(namespace: N, bundles: PageBundles) {
  if (!registered.has(namespace)) {
    registered.add(namespace);
    for (const locale of LOCALES) {
      const words = bundles[locale];
      if (words) i18next.addResourceBundle(locale, namespace, words, true, true);
    }
  }
  const { t } = useTranslation(namespace);
  return t;
}
