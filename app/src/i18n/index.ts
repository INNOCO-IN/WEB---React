import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales';
import { localeOf } from '../lib/lang';

import enCommon from './resources/en/common.json';
import enBuilder from './resources/en/builder.json';
import zhTWCommon from './resources/zh-TW/common.json';
import zhTWBuilder from './resources/zh-TW/builder.json';
import koCommon from './resources/ko/common.json';
import koBuilder from './resources/ko/builder.json';

/**
 * The string catalogue.
 *
 * i18next owns the words; `lib/lang.ts` owns which locale we are in. That
 * split is deliberate — the URL is this site's only source of truth for
 * language, so the browser-language detector is not installed. It would be a
 * second opinion on a question that already has an authoritative answer, and
 * the two would disagree the first time someone sent a link to a friend.
 *
 * Resources are bundled rather than fetched: six small JSON files, and a page
 * that has to wait on a network request before it can render its own nav is a
 * worse trade than the kilobytes. Swap in a backend plugin here if the
 * catalogue ever grows enough to justify it.
 */

export const NAMESPACES = ['common', 'builder'] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const resources = {
  en: { common: enCommon, builder: enBuilder },
  'zh-TW': { common: zhTWCommon, builder: zhTWBuilder },
  ko: { common: koCommon, builder: koBuilder },
} as const;

/**
 * The locale to start in, read straight off the URL.
 *
 * Synchronous and before the first render on purpose: resolving it in an
 * effect would paint the default language first and then swap, which is a
 * visible flash on every Korean page load.
 */
export function initialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  return localeOf(window.location.pathname);
}

void i18next.use(initReactI18next).init({
  resources,
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...LOCALES],
  ns: [...NAMESPACES],
  defaultNS: 'common',
  // React escapes for us; letting i18next escape as well double-encodes any
  // interpolated apostrophe, and the site's copy is full of them.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
