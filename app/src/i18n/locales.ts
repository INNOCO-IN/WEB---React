/**
 * The locales the site speaks, and every per-locale constant that is a lookup
 * rather than a translation.
 *
 * One table per concern, all keyed by `Locale`, so adding a language is a
 * compile error in each place that has to answer for it rather than a silent
 * fallback to English. That is deliberate: the previous shape asked
 * `lang === 'KO' ? … : …` in a dozen files, which a third language would have
 * passed straight through.
 */

export const LOCALES = ['en', 'zh-TW', 'ko'] as const;

export type Locale = (typeof LOCALES)[number];

/** Everything falls back here, and the site's own copy is written in it. */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * The URL segment each locale lives under. Empty means "no prefix".
 *
 * English has no prefix because it already had none: `/manifesto` has been the
 * English URL since the static site, every inbound link and the whole
 * LEGACY_ROUTES redirect table point at it, and moving it to `/en/manifesto`
 * would re-canonicalise fifty routes.
 *
 * `/en/…` is still understood — `stripLocale` accepts it and the router
 * redirects it to the bare path — so both spellings work. To make English
 * prefixed for real, set this to `'en'`: the router, the switcher, `hreflang`
 * and the canonical tags all read it from here.
 */
export const LOCALE_PREFIX: Record<Locale, string> = {
  en: '',
  'zh-TW': 'zh-tw',
  ko: 'ko',
};

/** Alternative URL spellings accepted on the way in, normalised on the way out. */
const PREFIX_ALIASES: Record<string, Locale> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  ko: 'ko',
  'ko-kr': 'ko',
  kr: 'ko',
  'zh-tw': 'zh-TW',
  zh_tw: 'zh-TW',
  'zh-hant': 'zh-TW',
  'zh-hant-tw': 'zh-TW',
  zh: 'zh-TW',
  tw: 'zh-TW',
};

/** Each language's name in its own language — never translated. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  ko: '한국어',
};

/** The two-or-three character label the header switcher has always shown. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  'zh-TW': '繁中',
  ko: 'KR',
};

/** BCP 47 for `<html lang>` and `hreflang`. */
export const HTML_LANG: Record<Locale, string> = {
  en: 'en',
  'zh-TW': 'zh-Hant-TW',
  ko: 'ko',
};

export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  'zh-TW': 'zh_TW',
  ko: 'ko_KR',
};

/** For `Intl` — dates read `12 September 2026` in English, not `9/12/2026`. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-GB',
  'zh-TW': 'zh-TW',
  ko: 'ko-KR',
};

/**
 * The page font stack. Latin faces have no Hangul or Han coverage, so each
 * locale appends the family that does before the generic fallback.
 */
export const FONT_STACK: Record<Locale, string> = {
  en: "'Newsreader', Georgia, 'Times New Roman', serif",
  'zh-TW': "'Newsreader', 'Noto Serif TC', Georgia, serif",
  ko: "'Newsreader', 'Noto Sans KR', Georgia, serif",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * A URL segment or Accept-Language tag → the internal code, or null.
 *
 * Case-insensitive and forgiving of the spellings that turn up in the wild —
 * `zh-Hant-TW` from a browser, `KR` from the site's own old link — because the
 * cost of not recognising one is dropping someone into the wrong language.
 */
export function normalizeLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/_/g, '-');
  return PREFIX_ALIASES[key] ?? null;
}
