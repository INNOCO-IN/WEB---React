import type { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from '../i18n';
import type { Locale } from '../i18n/locales';

/**
 * Renders at a URL, because the URL is what decides the locale.
 *
 * Every test that cares about language sets `route` rather than passing a prop
 * — which is the same thing the application does, so a test cannot pass while
 * the real page renders in the wrong language.
 */
export async function renderAt(ui: ReactElement, route = '/') {
  const locale: Locale = route.startsWith('/ko')
    ? 'ko'
    : route.startsWith('/zh-tw')
      ? 'zh-TW'
      : 'en';
  await i18next.changeLanguage(locale);
  return rtlRender(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
