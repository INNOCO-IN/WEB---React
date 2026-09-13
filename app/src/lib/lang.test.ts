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

  it('falls back to the section rather than the home page', () => {
    // No Korean project briefs exist, so the nearest true thing is the index.
    expect(alternateFor('/project/food-revolution', 'ko')).toMatchObject({
      to: '/ko/project',
      reach: 'section',
      available: true,
    });
    expect(alternateFor('/community/animators', 'ko')).toMatchObject({
      to: '/ko/community',
      reach: 'section',
    });
    expect(alternateFor('/story/submit', 'ko')).toMatchObject({ to: '/ko/story', reach: 'section' });
  });

  it('reaches the locale home only when there is nothing in between', () => {
    expect(alternateFor('/action-research', 'ko')).toMatchObject({ to: '/ko', reach: 'home' });
  });

  it('answers in Chinese for the pages that were collapsed', () => {
    // Sixteen page pairs are one component now, and a collapsed page answers
    // in every language — its Chinese words are empty and fall back, but the
    // address is real.
    expect(alternateFor('/news', 'zh-TW')).toMatchObject({ to: '/zh-tw/news', reach: 'page' });
    expect(alternateFor('/', 'zh-TW')).toMatchObject({ to: '/zh-tw', reach: 'page' });
  });

  it('degrades to the Chinese home for a page that was not collapsed', () => {
    // Manifesto's two editions had drifted, so it is still two components and
    // has no Chinese address. The switch lands on the nearest thing that does.
    expect(alternateFor('/manifesto', 'zh-TW')).toMatchObject({
      to: '/zh-tw',
      reach: 'home',
      available: true,
    });
  });

  it('tells the section and the home page apart', () => {
    // The switcher says which one happened, so the two cannot share an answer.
    // A Korean project brief keeps the reader in the projects; a Chinese one
    // of the four workshops still on the :slug template has nowhere nearer
    // than the home page, because `/zh-tw/workshop` is not a route either.
    expect(alternateFor('/project/food-revolution', 'ko').reach).toBe('section');
    expect(alternateFor('/workshop/heros-journey', 'zh-TW')).toMatchObject({
      to: '/zh-tw',
      reach: 'home',
      available: true,
    });
    // And the six that have Chinese pages of their own are not affected.
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
    expect(localize('/project/food-revolution', 'ko')).toBe('/project/food-revolution');
    expect(localize('/news', 'zh-TW')).toBe('/zh-tw/news');
  });

  it('leaves anything that is not an internal path alone', () => {
    expect(localize('https://example.com', 'ko')).toBe('https://example.com');
    expect(localize('#top', 'ko')).toBe('#top');
    expect(localize(null, 'ko')).toBe('');
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
