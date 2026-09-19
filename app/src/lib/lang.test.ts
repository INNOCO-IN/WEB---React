import { describe, expect, it, beforeEach } from 'vitest';
import {
  alternateFor,
  alternates,
  browserLocale,
  isCanonicalPath,
  isRoute,
  localeHome,
  localeOf,
  localize,
  pathIn,
  preferredLocale,
  readStoredLocale,
  storeLocale,
  stripLocale,
} from './lang';
import { ROUTE_PATHS } from './route-map';
import { normalizeLocale } from '../i18n/locales';

describe('locale detection', () => {
  it('reads the locale off the path', () => {
    expect(localeOf('/news')).toBe('en');
    expect(localeOf('/')).toBe('en');
    expect(localeOf('/ko/news')).toBe('ko');
    expect(localeOf('/ko')).toBe('ko');
    expect(localeOf('/zh-tw/news')).toBe('zh-TW');
  });

  it('normalises the spellings that turn up in links and browsers', () => {
    expect(normalizeLocale('KO')).toBe('ko');
    expect(normalizeLocale('ko-KR')).toBe('ko');
    expect(normalizeLocale('kr')).toBe('ko');
    expect(normalizeLocale('zh-Hant-TW')).toBe('zh-TW');
    expect(normalizeLocale('zh_TW')).toBe('zh-TW');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('fr')).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
  });

  it('does not mistake a page path for a locale', () => {
    expect(stripLocale('/workshop/pathfinder').locale).toBeNull();
    expect(stripLocale('/manifesto').locale).toBeNull();
  });
});

describe('locale-prefixed routing', () => {
  it('moves a path between locales', () => {
    expect(pathIn('/news', 'ko')).toBe('/ko/news');
    expect(pathIn('/ko/news', 'en')).toBe('/news');
    expect(pathIn('/ko/news', 'zh-TW')).toBe('/zh-tw/news');
    expect(pathIn('/', 'ko')).toBe('/ko');
    expect(pathIn('/ko', 'en')).toBe('/');
  });

  it('treats an understood-but-not-canonical spelling as needing a redirect', () => {
    // `/en/news` resolves, but this site spells English URLs without a prefix.
    expect(localeOf('/en/news')).toBe('en');
    expect(pathIn('/en/news', 'en')).toBe('/news');
    expect(isCanonicalPath('/en/news')).toBe(false);
    expect(isCanonicalPath('/news')).toBe(true);
    expect(isCanonicalPath('/ko/news')).toBe(true);
    expect(isCanonicalPath('/zh-Hant/news')).toBe(false);
  });

  it('knows which paths are real routes, patterns included', () => {
    expect(isRoute('/news')).toBe(true);
    expect(isRoute('/ko/news')).toBe(true);
    expect(isRoute('/workshop/mobius-making')).toBe(true);
    expect(isRoute('/nope')).toBe(false);
    // A builder page is data, not a generated route, and still has to count.
    expect(isRoute('/zh-tw/news')).toBe(true);
  });
});

describe('switching language keeps your place', () => {
  it('lands on the same page when the twin exists', () => {
    const alt = alternateFor('/ko/workshop/metanoia', 'en');
    expect(alt).toMatchObject({ to: '/workshop/metanoia', reach: 'page', available: true });
  });

  // Neither fallback is reached by a real page any more. The 2026 design wrote
  // a Korean twin for every page, and the converter now emits a Chinese route
  // for every page it converts — so what still exercises them is a URL with no
  // page behind it in any language: one the design dropped, or a mistyped one.
  it('falls back to the section rather than the home page', () => {
    // A page the design dropped. Nobody has a copy of it, in any language, so
    // the nearest true thing is the section it used to sit in.
    expect(alternateFor('/story/this-is-us', 'zh-TW')).toMatchObject({
      to: '/zh-tw/story',
      reach: 'section',
      available: true,
    });
    // The section itself is a page, in all three languages.
    expect(alternateFor('/story', 'zh-TW')).toMatchObject({
      to: '/zh-tw/story',
      reach: 'page',
    });
  });

  it('reaches the locale home only when there is nothing in between', () => {
    // `/collectives` is what `/people` used to be called. One segment, so
    // there is no section above it to stop at.
    expect(alternateFor('/collectives', 'zh-TW')).toMatchObject({ to: '/zh-tw', reach: 'home' });
  });

  it('lands on the page itself in Korean, everywhere', () => {
    // What the 2026 design changed: twenty-seven pages that had only an English
    // edition now have both, including every project brief and every community
    // entry. A Korean reader on any of them stays where they are.
    for (const path of ['/project/food-revolution', '/project/ctn', '/community/animators',
                        '/story/submit', '/action-research', '/people', '/pathway']) {
      expect(alternateFor(path, 'ko')).toMatchObject({ to: '/ko' + path, reach: 'page' });
    }
  });

  it('answers in Chinese for the pages that were collapsed', () => {
    // Sixteen page pairs are one component now, and a collapsed page answers
    // in every language — its Chinese words are empty and fall back, but the
    // address is real.
    expect(alternateFor('/news', 'zh-TW')).toMatchObject({ to: '/zh-tw/news', reach: 'page' });
    expect(alternateFor('/', 'zh-TW')).toMatchObject({ to: '/zh-tw', reach: 'page' });
  });

  it('answers in Chinese for the pages that were not collapsed either', () => {
    // Manifesto's two editions had drifted, so it is still two components —
    // and the English one is what Chinese reads. A pair that failed to
    // collapse is a reason for the *words* to fall back, not for the address
    // to go missing; conflating the two is what left the Chinese site with no
    // Workshop, Story, Project, Manifesto or BridgeBuilder at all.
    for (const path of ['/manifesto', '/workshop', '/story', '/story/submit', '/project',
                        '/project/asia-exchange', '/bridge-builder']) {
      expect(alternateFor(path, 'zh-TW')).toMatchObject({ to: `/zh-tw${path}`, reach: 'page' });
    }
  });

  it('answers in Chinese for the pages a template serves', () => {
    // The templates read the language off the path and render all three
    // perfectly well. What they lacked was a route pattern saying so, which is
    // why the signature workshop was a 404 in Chinese and worked in the other
    // two.
    for (const path of ['/workshop/mobius-making', '/workshop/heros-journey',
                        '/project/ctn', '/community/animators']) {
      expect(alternateFor(path, 'zh-TW')).toMatchObject({ to: `/zh-tw${path}`, reach: 'page' });
    }
  });

  it('tells the section and the home page apart', () => {
    // The switcher says which one happened, so the two cannot share an answer.
    // A dropped page keeps the reader in its section; one with no section
    // above it has nowhere nearer than the home page.
    expect(alternateFor('/story/this-is-us', 'zh-TW').reach).toBe('section');
    expect(alternateFor('/collectives', 'zh-TW')).toMatchObject({
      to: '/zh-tw',
      reach: 'home',
      available: true,
    });
    // And a page that exists is neither.
    expect(alternateFor('/workshop/pathfinder', 'zh-TW')).toMatchObject({
      to: '/zh-tw/workshop/pathfinder',
      reach: 'page',
    });
  });

  it('calls a locale unavailable only when it has no home at all', () => {
    // Every locale has a home now, so nothing is dead. The check still holds:
    // `available` follows whether the fallback target is a route.
    expect(alternates('/manifesto').every((a) => a.available)).toBe(true);
  });

  it('answers for every locale at once', () => {
    expect(alternates('/news').map((a) => a.locale)).toEqual(['en', 'zh-TW', 'ko']);
  });
});

describe('link localization', () => {
  it('takes the twin where there is one and keeps the default where there is not', () => {
    expect(localize('/workshop/metanoia', 'ko')).toBe('/ko/workshop/metanoia');
    expect(localize('/project/food-revolution', 'ko')).toBe('/ko/project/food-revolution');
    expect(localize('/news', 'zh-TW')).toBe('/zh-tw/news');
    expect(localize('/workshop/metanoia', 'zh-TW')).toBe('/zh-tw/workshop/metanoia');
    // A page the design dropped has no twin in any language, so the link is
    // left where it does answer rather than sent to an address that 404s.
    // This is the branch that used to swallow every Chinese workshop link.
    expect(localize('/story/this-is-us', 'zh-TW')).toBe('/story/this-is-us');
  });

  it('carries an anchor across without letting it fail the route check', () => {
    // The detail pages send you to `/#connect`, which is a page plus an
    // anchor. Localizing the whole string finds no route called
    // `/zh-tw/#connect` and gives up, which is how the "get involved" button
    // on a Chinese page came to be a link to the English home page.
    expect(localize('/#connect', 'zh-TW')).toBe('/zh-tw#connect');
    expect(localize('/ko#connect', 'ko')).toBe('/ko#connect');
    expect(localize('/workshop#register', 'ko')).toBe('/ko/workshop#register');
    // The default locale's own spelling is already right, and shortening it to
    // a bare `#connect` would make it relative to whatever page you are on.
    expect(localize('/#connect', 'en')).toBe('/#connect');
  });

  it('leaves anything that is not an internal path alone', () => {
    expect(localize('https://example.com', 'ko')).toBe('https://example.com');
    expect(localize('#top', 'ko')).toBe('#top');
    expect(localize(null, 'ko')).toBe('');
  });
});

/**
 * The check that would have caught this.
 *
 * A page going missing in one language is invisible from inside that language:
 * the nav still has the dot, because `localize` falls back to the English
 * address rather than linking a 404. Nothing renders wrong, nothing throws,
 * and the reader is simply moved to a different language mid-visit. So the
 * assertion has to be made against the table itself.
 */
describe('every page answers in every language', () => {
  const inLocale = (prefix: string) =>
    new Set(
      ROUTE_PATHS.filter((path) => path === prefix || path.startsWith(`${prefix}/`)).map((path) =>
        path === prefix ? '/' : path.slice(prefix.length),
      ),
    );

  const english = ROUTE_PATHS.filter(
    (path) => !path.startsWith('/ko') && !path.startsWith('/zh-tw'),
  );

  it.each([
    ['Korean', '/ko'],
    ['Traditional Chinese', '/zh-tw'],
  ])('has a %s route for every English one', (_name, prefix) => {
    const theirs = inLocale(prefix);
    expect(english.filter((path) => !theirs.has(path))).toEqual([]);
  });

  it('includes the ones a template serves', () => {
    // The hard case, and the one that was wrong: a `:slug` pattern is written
    // by hand rather than derived from a file in `site/`, so it is the one
    // kind of route that can be forgotten for a language.
    for (const pattern of ['/workshop/:slug', '/project/:slug', '/community/:slug']) {
      expect(ROUTE_PATHS).toContain(`/zh-tw${pattern}`);
      expect(ROUTE_PATHS).toContain(`/ko${pattern}`);
    }
  });
});

describe('the stored preference', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips, and normalises what it reads back', () => {
    expect(readStoredLocale()).toBeNull();
    storeLocale('ko');
    expect(readStoredLocale()).toBe('ko');
    window.localStorage.setItem('in.locale', 'zh-Hant-TW');
    expect(readStoredLocale()).toBe('zh-TW');
  });

  it('prefers a saved choice over the browser, and the browser over English', () => {
    expect(preferredLocale()).toBe(browserLocale() ?? 'en');
    storeLocale('zh-TW');
    expect(preferredLocale()).toBe('zh-TW');
  });

  it('ignores a stored value the site no longer speaks', () => {
    window.localStorage.setItem('in.locale', 'fr');
    expect(readStoredLocale()).toBeNull();
  });
});

describe('locale homes', () => {
  it('gives the default locale the bare root', () => {
    expect(localeHome('en')).toBe('/');
    expect(localeHome('ko')).toBe('/ko');
    expect(localeHome('zh-TW')).toBe('/zh-tw');
  });
});
