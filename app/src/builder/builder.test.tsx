import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAt } from '../test/render';
import BuilderRenderer from './Renderer';
import BuilderPageView from './BuilderPageView';
import { resolvePage, translationProgress } from './resolve';
import { customizeLayoutForLocale, returnToSharedLayout, setLocaleValue } from './operations';
import { validateDocument } from './validate';
import { parseBuilderPage } from './parse';
import { BUILDER_PAGES, BUILDER_SERVES, matchBuilderPath, pathForPage } from './routes';
import type { BuilderPage, PageDocument } from './types';

/**
 * A small page with everything the model has to get right: a shared tree, a
 * bound heading, a nested child, and one language that has only translated
 * half of it.
 */
function fixture(): BuilderPage {
  return {
    id: 'page_test',
    routeKey: 'test',
    defaultLocale: 'en',
    sharedDocument: {
      nodes: [
        {
          id: 'n1',
          type: 'section',
          props: { background: 'tan' },
          children: [
            { id: 'n2', type: 'heading', props: {}, bindings: { text: 'title' } },
            { id: 'n3', type: 'text', props: {}, bindings: { text: 'body' } },
          ],
        },
      ],
    },
    locales: {
      en: {
        slug: 'test',
        status: 'published',
        seo: { title: 'Test — IN', description: 'The English description.' },
        content: { title: 'English title', body: 'English body' },
      },
      ko: {
        slug: 'test',
        status: 'draft',
        seo: { title: '테스트 — IN', description: '' },
        content: { title: '한국어 제목' },
      },
    },
  };
}

describe('default-locale fallback', () => {
  it('fills a missing field from the default locale, field by field', () => {
    const resolved = resolvePage(fixture(), 'ko');
    expect(resolved.content.title).toBe('한국어 제목');
    expect(resolved.content.body).toBe('English body');
    expect(resolved.fallbackLocale).toBe('en');
  });

  it('records which values were borrowed rather than silently using them', () => {
    const resolved = resolvePage(fixture(), 'ko');
    expect([...resolved.fallbackKeys]).toEqual(['body']);
    expect(resolved.fallbackKeys.has('title')).toBe(false);
  });

  it('treats a blank translation as untranslated, not as a deliberate blank', () => {
    const page = setLocaleValue(fixture(), 'ko', 'body', '   ');
    const resolved = resolvePage(page, 'ko');
    expect(resolved.content.body).toBe('English body');
    expect(resolved.fallbackKeys.has('body')).toBe(true);
  });

  it('falls back for a locale that has no record at all', () => {
    const resolved = resolvePage(fixture(), 'zh-TW');
    expect(resolved.data).toBeNull();
    expect(resolved.content.title).toBe('English title');
    expect(resolved.content.body).toBe('English body');
  });

  it('does not write the borrowed value back into the locale', () => {
    const page = fixture();
    resolvePage(page, 'ko');
    expect(page.locales.ko?.content.body).toBeUndefined();
  });
});

describe('missing-translation indication', () => {
  it('counts what the schema asks for, not what happens to be stored', () => {
    const progress = translationProgress(fixture(), 'ko');
    expect(progress.required.sort()).toEqual(['body', 'title']);
    expect(progress.missing).toEqual(['body']);
    expect(progress.borrowed).toEqual(['body']);
    expect(progress.complete).toBe(false);
    expect(progress.untouched).toBe(false);
  });

  it('calls a fully translated locale complete', () => {
    const page = setLocaleValue(fixture(), 'ko', 'body', '한국어 본문');
    expect(translationProgress(page, 'ko').complete).toBe(true);
  });

  it('marks a locale nobody has started as untouched', () => {
    expect(translationProgress(fixture(), 'zh-TW').untouched).toBe(true);
  });
});

describe('localized SEO', () => {
  it('uses the locale title and borrows the description', () => {
    const resolved = resolvePage(fixture(), 'ko');
    expect(resolved.seo.title).toBe('테스트 — IN');
    expect(resolved.seo.description).toBe('The English description.');
    expect(resolved.seoIsFallback).toBe(true);
  });

  it('borrows both for a locale with no record', () => {
    const resolved = resolvePage(fixture(), 'zh-TW');
    expect(resolved.seo.title).toBe('Test — IN');
    expect(resolved.seoIsFallback).toBe(true);
  });
});

describe('shared layout and per-locale overrides', () => {
  it('renders the shared document by default', () => {
    const resolved = resolvePage(fixture(), 'ko');
    expect(resolved.usesOverride).toBe(false);
    expect(resolved.document.nodes[0].id).toBe('n1');
  });

  it('clones the shared tree on customize, keeping element ids', () => {
    const page = customizeLayoutForLocale(fixture(), 'ko');
    const override = page.locales.ko?.documentOverride as PageDocument;
    expect(override.nodes[0].id).toBe('n1');
    expect(override.nodes[0].children?.[0].id).toBe('n2');
    expect(resolvePage(page, 'ko').usesOverride).toBe(true);
  });

  it('does not mutate the shared document when a locale diverges', () => {
    const page = fixture();
    const next = customizeLayoutForLocale(page, 'ko');
    const override = next.locales.ko?.documentOverride as PageDocument;
    override.nodes[0].props.background = 'magenta';
    expect(page.sharedDocument.nodes[0].props.background).toBe('tan');
    expect(next.sharedDocument.nodes[0].props.background).toBe('tan');
  });

  it('leaves other locales alone', () => {
    const next = customizeLayoutForLocale(fixture(), 'ko');
    expect(next.locales.en?.documentOverride).toBeUndefined();
  });

  it('removes only the override on return, keeping text, SEO and slug', () => {
    const customized = customizeLayoutForLocale(fixture(), 'ko');
    const back = returnToSharedLayout(customized, 'ko');
    expect(back.locales.ko?.documentOverride).toBeUndefined();
    expect(back.locales.ko?.content.title).toBe('한국어 제목');
    expect(back.locales.ko?.seo.title).toBe('테스트 — IN');
    expect(back.locales.ko?.slug).toBe('test');
    expect(back.locales.ko?.status).toBe('draft');
  });

  it('writes a translation into one locale only', () => {
    const next = setLocaleValue(fixture(), 'ko', 'body', '한국어 본문');
    expect(next.locales.ko?.content.body).toBe('한국어 본문');
    expect(next.locales.en?.content.body).toBe('English body');
  });
});

describe('document validation', () => {
  it('accepts a well-formed document', () => {
    expect(validateDocument(fixture().sharedDocument).ok).toBe(true);
  });

  it('rejects an unregistered element type', () => {
    const result = validateDocument({ nodes: [{ id: 'x', type: 'script', props: {} }] });
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatchObject({ code: 'unknownElement', detail: { type: 'script' } });
  });

  it('rejects duplicate and missing ids', () => {
    const dup = validateDocument({
      nodes: [
        { id: 'a', type: 'spacer', props: {} },
        { id: 'a', type: 'spacer', props: {} },
      ],
    });
    expect(dup.ok).toBe(false);
    expect(dup.issues.some((i) => i.code === 'duplicateId')).toBe(true);

    const missing = validateDocument({ nodes: [{ type: 'spacer', props: {} }] });
    expect(missing.issues.some((i) => i.code === 'missingId')).toBe(true);
  });

  it('rejects children on a leaf element', () => {
    const result = validateDocument({
      nodes: [{ id: 'a', type: 'spacer', props: {}, children: [{ id: 'b', type: 'spacer', props: {} }] }],
    });
    expect(result.issues.some((i) => i.code === 'childrenNotAllowed')).toBe(true);
  });

  it('refuses anything that is not a document at all', () => {
    expect(validateDocument(null).ok).toBe(false);
    expect(validateDocument({ nodes: 'nope' }).ok).toBe(false);
  });
});

describe('parsing a stored page', () => {
  it('accepts the bundled page', () => {
    expect(parseBuilderPage(BUILDER_PAGES[0])).not.toBeNull();
  });

  it('refuses a page with no record in its own default locale', () => {
    const page = { ...fixture(), locales: { ko: fixture().locales.ko } };
    expect(parseBuilderPage(page)).toBeNull();
  });

  it('drops a locale the build does not speak rather than failing', () => {
    const raw = { ...fixture(), locales: { ...fixture().locales, fr: fixture().locales.en } };
    const parsed = parseBuilderPage(raw);
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!.locales).sort()).toEqual(['en', 'ko']);
  });
});

describe('the renderer', () => {
  it('renders a shared layout, recursing into children', async () => {
    const resolved = resolvePage(fixture(), 'en');
    await renderAt(
      <BuilderRenderer document={resolved.document} content={resolved.content} />,
    );
    expect(screen.getByRole('heading', { name: 'English title' })).toBeInTheDocument();
    expect(screen.getByText('English body')).toBeInTheDocument();
  });

  it('renders the borrowed value, outlined, when a locale is behind', async () => {
    const resolved = resolvePage(fixture(), 'ko');
    const { container } = await renderAt(
      <BuilderRenderer
        document={resolved.document}
        content={resolved.content}
        fallbackKeys={resolved.fallbackKeys}
        fallbackName="English"
        showProblems
      />,
      '/ko',
    );
    expect(screen.getByRole('heading', { name: '한국어 제목' })).toBeInTheDocument();
    const outlined = container.querySelectorAll('.bx-fallback');
    expect(outlined).toHaveLength(1);
    expect(outlined[0].getAttribute('data-fallback-keys')).toBe('body');
  });

  it('skips an unregistered element instead of throwing', async () => {
    const document: PageDocument = {
      nodes: [
        { id: 'ok', type: 'heading', props: { text: 'Still here' } },
        // Cast: this is precisely the case where saved data disagrees with the
        // registry, which the type system cannot represent but the renderer must.
        { id: 'bad', type: 'iframe' as never, props: {} },
      ],
    };
    await renderAt(<BuilderRenderer document={document} content={{}} showProblems />);
    expect(screen.getByRole('heading', { name: 'Still here' })).toBeInTheDocument();
    expect(screen.getByText(/is not a registered element/)).toBeInTheDocument();
  });

  it('never renders a prop as its binding key', async () => {
    const document: PageDocument = {
      nodes: [{ id: 'h', type: 'heading', props: {}, bindings: { text: 'nothing.here' } }],
    };
    const { container } = await renderAt(<BuilderRenderer document={document} content={{}} />);
    expect(container.textContent).not.toContain('nothing.here');
  });
});

describe('the migrated page', () => {
  const page = BUILDER_PAGES[0];

  it('kept its stable id and routeKey', () => {
    expect(page.id).toBe('page_news');
    expect(page.routeKey).toBe('news');
  });

  it('put the existing copy in the locales it was already written in', () => {
    expect(Object.keys(page.locales.en!.content)).toHaveLength(12);
    expect(Object.keys(page.locales.ko!.content)).toHaveLength(12);
    expect(page.locales.en!.content['hero.title.text']).toBe(
      'What the network is doing right now.',
    );
    expect(page.locales.ko!.content['hero.title.text']).toBe('네트워크가 지금 하고 있는 일.');
  });

  it('left the new language empty rather than marking English as translated', () => {
    expect(page.locales['zh-TW']?.content).toEqual({});
    expect(page.locales['zh-TW']?.status).toBe('draft');
    expect(translationProgress(page, 'zh-TW').complete).toBe(false);
  });

  it('kept element order and the shared visual settings', () => {
    const ids = page.sharedDocument.nodes.map((n) => n.id);
    expect(ids).toEqual(['news:hero', 'news:insight', 'news:feed', 'news:cta']);
    expect(page.sharedDocument.nodes[0].props.background).toBe('tan');
  });

  it('knows its address in every locale, from the localized slug', () => {
    expect(pathForPage(page, 'en')).toBe('/news');
    expect(pathForPage(page, 'ko')).toBe('/ko/news');
    // zh-TW has no record of its own, so it borrows the default locale's slug
    // rather than becoming unreachable.
    expect(pathForPage(page, 'zh-TW')).toBe('/zh-tw/news');
  });

  it('answers for nothing until a routeKey is listed', () => {
    // News is served by a collapsed component now, so the builder stands down.
    // `BUILDER_SERVES` is the only switch; the page itself is unchanged.
    expect(BUILDER_SERVES).toEqual([]);
    expect(matchBuilderPath('/zh-tw/news')).toBeNull();
    expect(matchBuilderPath('/nope')).toBeNull();
  });

  it('still renders on demand, in a language it has no words for', async () => {
    await renderAt(<BuilderPageView page={page} locale="zh-TW" />, '/zh-tw/news');
    expect(screen.getByRole('heading', { name: 'What the network is doing right now.' })).toBeInTheDocument();
    // The shell is Chinese even where the page copy is not.
    expect(screen.getAllByText('工作坊').length).toBeGreaterThan(0);
  });
});
