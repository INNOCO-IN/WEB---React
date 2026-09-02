import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { alternates, storeLocale, useLocale } from '../lib/lang';
import { LOCALE_SHORT, HTML_LANG, type Locale } from '../i18n/locales';

/**
 * The EN / 繁中 / KR switch, in the header and the footer.
 *
 * Three states per language, and it is honest about all three:
 *
 *   - the same page exists → a plain link
 *   - it does not, but the section above it does → a link, dimmed, saying so
 *   - the language has nothing at all → not a link, and says that instead
 *
 * The middle case is the common one. Most of this site exists in English only,
 * and sending someone from a project brief to the Korean home page reads as
 * losing their place rather than as the page not existing.
 *
 * Each entry is a real link, so it is reachable by Tab, activates on Enter,
 * and can be opened in a new tab. `lang` on each one tells a screen reader to
 * pronounce the label in its own language rather than the page's, and
 * `aria-current` marks where you are.
 */

interface Props {
  /** Distinguishes the header and footer copies for assistive technology. */
  idPrefix: string;
  className?: string;
}

export default function LanguageSwitcher({ idPrefix, className }: Props) {
  const { pathname } = useLocation();
  const current = useLocale();
  const { t } = useTranslation();
  const labelId = `${idPrefix}-language-label`;

  return (
    <nav className={className} aria-labelledby={labelId}>
      <span id={labelId} className="in-visually-hidden">
        {t('language.switcherLabel')}
      </span>

      {alternates(pathname).map((alt, index) => {
        const name = t(`language.names.${alt.locale}` as 'language.names.en');
        const short = LOCALE_SHORT[alt.locale];
        const separator = index > 0 ? <span aria-hidden="true">/</span> : null;

        if (alt.locale === current) {
          return (
            <span key={alt.locale}>
              {separator}
              <span className="is-current" lang={HTML_LANG[alt.locale]} aria-current="true">
                {short}
              </span>
              <span className="in-visually-hidden">{t('language.current', { name })}</span>
            </span>
          );
        }

        if (!alt.available) {
          return (
            <span key={alt.locale}>
              {separator}
              <span
                className="is-unavailable"
                lang={HTML_LANG[alt.locale]}
                aria-disabled="true"
                title={t('language.unavailable', { name })}
              >
                {short}
              </span>
            </span>
          );
        }

        const note = alt.exact
          ? t('language.switchTo', { name })
          : t('language.approximate', { name });

        return (
          <span key={alt.locale}>
            {separator}
            <Link
              to={alt.to}
              lang={HTML_LANG[alt.locale]}
              className={alt.exact ? undefined : 'is-approximate'}
              title={alt.exact ? undefined : note}
              aria-label={note}
              onClick={() => rememberChoice(alt.locale)}
            >
              {short}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Clicking a language is the only signal that someone *chose* one, as opposed
 * to following a link that happened to be in it. So it is the only thing that
 * writes the preference.
 */
function rememberChoice(locale: Locale): void {
  storeLocale(locale);
}
