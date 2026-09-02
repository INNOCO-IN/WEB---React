import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LOCALES, LOCALE_NAMES, HTML_LANG, type Locale } from '../../i18n/locales';
import { alternateFor } from '../../lib/lang';
import { resolvePage, translationProgress } from '../resolve';
import { customizeLayoutForLocale, returnToSharedLayout } from '../operations';
import type { BuilderPage } from '../types';
import '../builder.css';

/**
 * The editor's status strip.
 *
 * Four facts, always visible, because each of them changes what an edit will
 * do: which language you are editing, how much of it is translated, whether it
 * is published, and — the one that catches people out — whether this language
 * is on the shared layout. Editing a shared layout changes every language that
 * has not diverged, and there is no way to know that from looking at the page.
 *
 * The two layout actions are deliberately two steps. Both are hard to undo by
 * hand: one makes a language stop receiving shared changes, the other throws
 * away a layout somebody built.
 */

interface Props {
  page: BuilderPage;
  locale: Locale;
  /**
   * Applies an edit. Omitted where the page store is read-only — the bundled
   * JSON — in which case the actions are shown disabled rather than hidden, so
   * the model is legible even where it cannot be changed here.
   */
  onChange?: (next: BuilderPage) => void;
}

type Pending = 'customize' | 'return' | null;

export default function LocaleToolbar({ page, locale, onChange }: Props) {
  const { t } = useTranslation('builder');
  const { pathname } = useLocation();
  const [pending, setPending] = useState<Pending>(null);

  const resolved = resolvePage(page, locale);
  const progress = translationProgress(page, locale, resolved);
  const data = page.locales[locale];
  const name = LOCALE_NAMES[locale];

  const translation = progress.untouched
    ? 'untranslated'
    : progress.complete
      ? 'complete'
      : 'incomplete';
  const status = data?.status ?? 'draft';
  const layout = resolved.usesOverride ? 'custom' : 'shared';

  const apply = (next: BuilderPage) => {
    onChange?.(next);
    setPending(null);
  };

  return (
    <div className="bx-toolbar">
      <div className="bx-toolbar__facts">
        <span className="bx-fact">
          <span className="bx-fact__label">{t('toolbar.language')}</span>
          <span className="bx-fact__value" lang={HTML_LANG[locale]}>
            {name}
          </span>
        </span>

        <span className="bx-fact">
          <span className="bx-fact__label">{t('toolbar.translation')}</span>
          <span className={`bx-pill bx-pill--${translation}`}>{t(`translation.${translation}`)}</span>
          {progress.missing.length > 0 && (
            <span className="bx-fact__value">
              {t('toolbar.missing', { count: progress.missing.length })}
            </span>
          )}
        </span>

        <span className="bx-fact">
          <span className="bx-fact__label">{t('toolbar.layout')}</span>
          <span className={`bx-pill bx-pill--${layout}`}>{t(`layout.${layout}`)}</span>
        </span>

        <span className="bx-fact">
          <span className="bx-fact__label">{t('toolbar.status')}</span>
          <span className={`bx-pill bx-pill--${status}`}>{t(`status.${status}`)}</span>
        </span>

        {resolved.fallbackLocale && (
          <span className="bx-fact">
            <span className="bx-fact__value">
              {t('toolbar.fallbackFrom', { name: LOCALE_NAMES[resolved.fallbackLocale] })}
            </span>
          </span>
        )}
      </div>

      <LocaleTabs page={page} current={locale} pathname={pathname} />

      <div className="bx-toolbar__actions">
        {resolved.usesOverride ? (
          <button
            type="button"
            className="bx-action bx-action--danger"
            disabled={!onChange}
            onClick={() => setPending('return')}
          >
            {t('actions.returnToShared')}
          </button>
        ) : (
          <button
            type="button"
            className="bx-action"
            disabled={!onChange}
            onClick={() => setPending('customize')}
          >
            {t('actions.customizeLayout')}
          </button>
        )}
      </div>

      <p className="bx-note">{t(resolved.usesOverride ? 'layout.customNote' : 'layout.sharedNote')}</p>

      {pending && (
        <div className="bx-note" role="alertdialog" aria-live="polite">
          <strong>
            {t(pending === 'return' ? 'confirm.returnToSharedTitle' : 'confirm.customizeTitle', {
              name,
            })}
          </strong>{' '}
          {t(pending === 'return' ? 'confirm.returnToSharedBody' : 'confirm.customizeBody', { name })}
          <span className="bx-toolbar__actions">
            <button
              type="button"
              className="bx-action"
              onClick={() =>
                apply(
                  pending === 'return'
                    ? returnToSharedLayout(page, locale)
                    : customizeLayoutForLocale(page, locale),
                )
              }
            >
              {t('actions.confirm')}
            </button>
            <button type="button" className="bx-action" onClick={() => setPending(null)}>
              {t('actions.cancel')}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Jumping between this page's languages.
 *
 * Links rather than buttons, because switching language is a navigation — the
 * URL is what decides the locale, so changing it in place would put the
 * toolbar and the address bar into disagreement.
 */
function LocaleTabs({
  page,
  current,
  pathname,
}: {
  page: BuilderPage;
  current: Locale;
  pathname: string;
}) {
  const { t } = useTranslation('builder');

  return (
    <div className="bx-langs">
      {LOCALES.map((locale) => {
        const alt = alternateFor(pathname, locale);
        const started = Boolean(page.locales[locale]);
        const label = LOCALE_NAMES[locale];

        if (locale === current) {
          return (
            <button key={locale} type="button" className="bx-lang" aria-pressed="true" disabled>
              {label}
            </button>
          );
        }
        if (!alt.available) {
          return (
            <button
              key={locale}
              type="button"
              className="bx-lang"
              disabled
              title={t('empty.locale', { name: label })}
            >
              {label}
            </button>
          );
        }
        return (
          <Link
            key={locale}
            to={alt.to}
            className="bx-lang"
            lang={HTML_LANG[locale]}
            title={started ? undefined : t('empty.locale', { name: label })}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
