import type common from './resources/en/common.json';
import type builder from './resources/en/builder.json';

/**
 * Types the catalogue off the English resources.
 *
 * English is the fallback locale, so it is the one guaranteed to have every
 * key — which makes it the right shape to type against. A `t('nav.items.typo')`
 * is a compile error rather than a string that renders as its own key.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      builder: typeof builder;
    };
  }
}
