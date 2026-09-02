import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import i18next from './i18n';

/**
 * The routing table, end to end.
 *
 * These are the tests that would have caught the refactor breaking the site:
 * every existing page still resolves at the URL it has always had, in the
 * language it has always been in, and the new locale reaches the one page that
 * has been migrated.
 */

async function visit(route: string) {
  const locale = route.startsWith('/ko') ? 'ko' : route.startsWith('/zh-tw') ? 'zh-TW' : 'en';
  await i18next.changeLanguage(locale);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe('existing pages still render', () => {
  it('serves the English news page at the URL it has always had', async () => {
    await visit('/news');
    expect(
      await screen.findByRole('heading', { name: 'What the network is doing right now.' }),
    ).toBeInTheDocument();
  });

  it('serves the Korean news page, with Korean chrome', async () => {
    await visit('/ko/news');
    expect(
      await screen.findByRole('heading', { name: '네트워크가 지금 하고 있는 일.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('소식').length).toBeGreaterThan(0);
  });

  it('serves a converted page that has no translation', async () => {
    await visit('/manifesto');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
  });

  it('serves a template-backed detail page', async () => {
    await visit('/workshop/metanoia');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
  });
});

describe('the new locale', () => {
  it('serves a collapsed page in a language it has no words for yet', async () => {
    await visit('/zh-tw/news');
    // News is one component for every language. Chinese has an empty word
    // file, so the copy falls back to English…
    expect(
      await screen.findByRole('heading', { name: 'What the network is doing right now.' }),
    ).toBeInTheDocument();
    // …while the chrome, which is translated, is Chinese.
    expect(screen.getAllByText('工作坊').length).toBeGreaterThan(0);
  });

  it('marks the document as Traditional Chinese', async () => {
    await visit('/zh-tw/news');
    await screen.findByRole('banner');
    expect(document.documentElement.lang).toBe('zh-Hant-TW');
  });
});

describe('URL normalisation', () => {
  it('redirects the prefixed English spelling to the bare path', async () => {
    await visit('/en/news');
    expect(
      await screen.findByRole('heading', { name: 'What the network is doing right now.' }),
    ).toBeInTheDocument();
  });

  it('redirects an alternative Chinese spelling to the canonical one', async () => {
    await visit('/zh-Hant/news');
    expect(
      await screen.findByRole('heading', { name: 'What the network is doing right now.' }),
    ).toBeInTheDocument();
  });

  it('keeps every legacy filename alive', async () => {
    await visit('/Workshop.EN.dc.html');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(document.title).toBe('Workshop — IN');
  });
});

describe('the 404', () => {
  it('answers in the language of the URL that missed', async () => {
    await visit('/ko/nope');
    expect(await screen.findByRole('heading', { name: '이 페이지는 패턴의 일부가 아닙니다.' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko');
  });

  it('answers in English for an English miss', async () => {
    await visit('/nope-at-all');
    expect(
      await screen.findByRole('heading', { name: "This page isn't part of the pattern." }),
    ).toBeInTheDocument();
  });
});

describe('the language switcher', () => {
  /**
   * Opens the header's switch and hands back its list.
   *
   * The trigger is found by its accessible name in whatever language the page
   * is in, which is also the assertion that the name is translated at all.
   */
  const TRIGGER = /Current language|현재 언어|目前語言/;

  async function openSwitcher() {
    await screen.findByRole('banner');
    const [trigger] = screen.getAllByRole('button', { name: TRIGGER });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Followed through `aria-controls` rather than looked up by name, because
    // the list's name is translated too — and following it is the check that
    // the button and its list are actually wired together.
    const listId = trigger.getAttribute('aria-controls');
    const list = listId ? document.getElementById(listId) : null;
    expect(list).not.toBeNull();
    expect(list).toBeVisible();
    return within(list as HTMLElement);
  }

  it('opens on the trigger and closes on Escape', async () => {
    await visit('/news');
    await screen.findByRole('banner');
    const [trigger] = screen.getAllByRole('button', { name: TRIGGER });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('opens on ArrowDown and moves between the languages with the arrows', async () => {
    await visit('/news');
    await screen.findByRole('banner');
    const [trigger] = screen.getAllByRole('button', { name: TRIGGER });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const listId = trigger.getAttribute('aria-controls') as string;
    const list = document.getElementById(listId) as HTMLElement;
    const entries = Array.from(list.querySelectorAll<HTMLElement>('[data-lang-item]'));
    expect(entries).toHaveLength(3);

    // The trigger opens and hands focus to the first entry on the next frame.
    entries[0].focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(entries[1]).toHaveFocus();
    fireEvent.keyDown(list, { key: 'End' });
    expect(entries[2]).toHaveFocus();
    // And it wraps, so you cannot get stuck at the bottom.
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(entries[0]).toHaveFocus();
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(entries[2]).toHaveFocus();
  });

  it('names each language in its own language', async () => {
    await visit('/news');
    const menu = await openSwitcher();
    expect(menu.getByText('English')).toBeInTheDocument();
    expect(menu.getByText('繁體中文')).toBeInTheDocument();
    expect(menu.getByText('한국어')).toBeInTheDocument();
  });

  it('marks the language you are already reading', async () => {
    await visit('/ko/news');
    const menu = await openSwitcher();
    expect(menu.getByText('한국어')).toHaveAttribute('aria-current', 'true');
  });

  it('is exact in all three languages on a collapsed page', async () => {
    await visit('/news');
    const menu = await openSwitcher();
    expect(menu.getByRole('link', { name: /Korean/ })).toHaveAttribute('href', '/ko/news');
    const chinese = menu.getByRole('link', { name: /Traditional Chinese/ });
    expect(chinese).toHaveAttribute('href', '/zh-tw/news');
    expect(chinese).not.toHaveClass('is-approximate');
  });

  it('keeps you on the same page when a twin exists', async () => {
    await visit('/workshop/metanoia');
    const menu = await openSwitcher();
    expect(menu.getByRole('link', { name: /Korean/ })).toHaveAttribute(
      'href',
      '/ko/workshop/metanoia',
    );
  });

  it('offers the section, marked, where the page has no twin', async () => {
    await visit('/project/food-revolution');
    const menu = await openSwitcher();
    const korean = menu.getByRole('link', { name: /Korean/ });
    expect(korean).toHaveAttribute('href', '/ko/project');
    expect(korean).toHaveClass('is-approximate');
    // And it says why, rather than only looking different.
    expect(korean).toHaveAccessibleName(/no Korean version/i);
  });
});

describe('document metadata', () => {
  it('titles a page in its own language', async () => {
    await visit('/ko/news');
    await screen.findByRole('banner');
    expect(document.title).toBe('소식 — IN');
    expect(document.documentElement.lang).toBe('ko');
  });

  it('emits hreflang only where a real twin exists', async () => {
    await visit('/news');
    await screen.findByRole('banner');
    const alternates = [...document.head.querySelectorAll('link[rel="alternate"]')].map((link) => [
      link.getAttribute('hreflang'),
      link.getAttribute('href'),
    ]);
    expect(alternates).toEqual(
      expect.arrayContaining([
        ['en', expect.stringContaining('/news')],
        ['ko', expect.stringContaining('/ko/news')],
        ['zh-Hant-TW', expect.stringContaining('/zh-tw/news')],
        ['x-default', expect.stringContaining('/news')],
      ]),
    );
  });

  it('emits no hreflang for a page that exists in one language only', async () => {
    await visit('/action-research');
    await screen.findByRole('banner');
    expect(document.head.querySelectorAll('link[rel="alternate"]')).toHaveLength(0);
  });

  it('sets a canonical URL', async () => {
    await visit('/ko/news');
    await screen.findByRole('banner');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
      '/ko/news',
    );
  });
});
