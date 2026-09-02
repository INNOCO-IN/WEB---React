import { useMemo } from 'react';
import SiteLayout from '../components/SiteLayout';
import BuilderRenderer from './Renderer';
import LocaleToolbar from './editor/LocaleToolbar';
import { resolvePage } from './resolve';
import { LOCALE_NAMES } from '../i18n/locales';
import type { BuilderPage } from './types';
import type { Locale } from '../i18n/locales';

/**
 * A builder page on the public site.
 *
 * The same chrome every other page sits in, so a migrated page and a converted
 * one are indistinguishable to a visitor — which is the test of whether the
 * migration preserved the design.
 *
 * The locale toolbar appears only in development. It is the editor's status
 * strip, and a visitor has no business seeing which fields are untranslated.
 */

interface Props {
  page: BuilderPage;
  locale: Locale;
  /** Show the editor's toolbar and fallback outlines. */
  editing?: boolean;
}

export default function BuilderPageView({ page, locale, editing = false }: Props) {
  const resolved = useMemo(() => resolvePage(page, locale), [page, locale]);
  const showEditorChrome = editing || import.meta.env.DEV;

  return (
    <SiteLayout
      locale={locale}
      page={`builder:${page.routeKey}`}
      title={resolved.seo.title || undefined}
      description={resolved.seo.description || undefined}
      footer={{ loop: '0.36' }}
    >
      {showEditorChrome ? <LocaleToolbar page={page} locale={locale} /> : null}

      <BuilderRenderer
        document={resolved.document}
        content={resolved.content}
        fallbackKeys={showEditorChrome ? resolved.fallbackKeys : undefined}
        fallbackName={resolved.fallbackLocale ? LOCALE_NAMES[resolved.fallbackLocale] : ''}
        showProblems={showEditorChrome}
      />
    </SiteLayout>
  );
}
