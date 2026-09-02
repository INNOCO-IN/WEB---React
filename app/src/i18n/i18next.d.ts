import type common from './resources/en/common.json';
import type builder from './resources/en/builder.json';
import type { PAGE_RESOURCES } from './resources/pages';

/**
 * Types the catalogue off the English resources.
 *
 * English is the fallback locale, so it is the one guaranteed to have every
 * key — which makes it the right shape to type against. A `t('nav.items.typo')`
 * is a compile error rather than a string that renders as its own key.
 *
 * The page namespaces come in the same way, from the generated bundle, so a
 * collapsed page's `t('001_h1')` is checked against the words the converter
 * actually extracted for it.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      builder: typeof builder;
    } & (typeof PAGE_RESOURCES)['en'];
  }
}
