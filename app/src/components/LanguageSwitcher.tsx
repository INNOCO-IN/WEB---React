import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { alternates, storeLocale, useLocale } from '../lib/lang';
import { LOCALE_NAMES, LOCALE_SHORT, HTML_LANG, type Locale } from '../i18n/locales';
import './LanguageSwitcher.css';

/**
 * The language switch: a button showing the current language, and a list of
 * the others under it.
 *
 * A disclosure — a button that reveals a list of links — rather than a
 * `role="menu"` widget. Menu semantics are for application commands, and a
 * screen reader announcing "menu, 3 items" over what are plainly three links
 * to three pages is worse than announcing three links. The keyboard support
 * here is the part `role="menu"` would have bought, written out: arrows move
 * between the languages, Escape closes and hands focus back, and Tab still
 * works the way Tab works.
 *
 * Three states per language, and it is honest about all three:
 *
 *   - the same page exists → a plain link
 *   - it does not, but something above it does → a link, marked, saying so
 *   - the language has nothing at all → not a link, and says that instead
 *
 * The middle case is the common one. Most of this site exists in English only,
 * and sending someone from a project brief to the Korean home page reads as
 * losing their place rather than as the page not existing.
 *
 * The list stays in the DOM when closed rather than being unmounted, so the
 * links are there for anything reading the page without running the toggle.
 */

interface Props {
  /** Distinguishes the header and footer copies for assistive technology. */
  idPrefix: string;
  className?: string;
  /** Which way the list opens. The footer's has nothing below it. */
  placement?: 'down' | 'up';
}

export default function LanguageSwitcher({ idPrefix, className, placement = 'down' }: Props) {
  const { pathname } = useLocation();
  const current = useLocale();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const menuId = `${idPrefix}-language-menu${generatedId}`;
  const labelId = `${idPrefix}-language-label${generatedId}`;

  // Navigating is the point of the thing, so the list closes behind you.
  useEffect(() => setOpen(false), [pathname]);

  // A click anywhere else, and it should be gone. Pointerdown rather than
  // click, so it closes on press instead of waiting for the release.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  /** The focusable entries, in the order they are shown. */
  const items = () =>
    Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('[data-lang-item]') ?? []);

  function moveFocus(step: 1 | -1, from?: number) {
    const all = items();
    if (!all.length) return;
    const index = from ?? all.indexOf(document.activeElement as HTMLAnchorElement);
    const next = index < 0 ? (step === 1 ? 0 : all.length - 1) : (index + step + all.length) % all.length;
    all[next]?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      // After the list is shown, not before it — the entries cannot take
      // focus while their container is still hidden.
      requestAnimationFrame(() => moveFocus(1, event.key === 'ArrowDown' ? -1 : items().length));
    }
  }

  function onMenuKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        items()[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items().at(-1)?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
        break;
      default:
    }
  }

  const currentName = t(`language.names.${current}` as 'language.names.en');

  return (
    <div
      className={['in-lang', className].filter(Boolean).join(' ')}
      data-placement={placement}
      ref={root}
      onKeyDown={(event) => {
        // Escape from anywhere inside, including the trigger.
        if (event.key === 'Escape' && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <span id={labelId} className="in-visually-hidden">
        {t('language.switcherLabel')}
      </span>

      <button
        ref={trigger}
        type="button"
        className="in-lang__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-describedby={labelId}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={onTriggerKeyDown}
      >
        <span lang={HTML_LANG[current]}>{LOCALE_SHORT[current]}</span>
        <span className="in-visually-hidden">{t('language.current', { name: currentName })}</span>
        <Chevron />
      </button>

      <ul
        id={menuId}
        className="in-lang__menu"
        aria-labelledby={labelId}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
      >
        {alternates(pathname).map((alt) => {
          const name = LOCALE_NAMES[alt.locale];
          const translated = t(`language.names.${alt.locale}` as 'language.names.en');

          if (alt.locale === current) {
            return (
              <li key={alt.locale}>
                <span
                  className="in-lang__item is-current"
                  lang={HTML_LANG[alt.locale]}
                  aria-current="true"
                  data-lang-item
                  tabIndex={-1}
                >
                  {name}
                </span>
              </li>
            );
          }

          if (!alt.available) {
            return (
              <li key={alt.locale}>
                <span
                  className="in-lang__item is-unavailable"
                  lang={HTML_LANG[alt.locale]}
                  aria-disabled="true"
                  title={t('language.unavailable', { name: translated })}
                >
                  {name}
                  <span className="in-lang__note">{t('language.unavailableShort')}</span>
                </span>
              </li>
            );
          }

          const note = alt.exact
            ? t('language.switchTo', { name: translated })
            : t('language.approximate', { name: translated });

          return (
            <li key={alt.locale}>
              <Link
                to={alt.to}
                lang={HTML_LANG[alt.locale]}
                className={`in-lang__item${alt.exact ? '' : ' is-approximate'}`}
                title={alt.exact ? undefined : note}
                aria-label={note}
                data-lang-item
                onClick={() => storeLocale(alt.locale)}
              >
                {name}
                {alt.exact ? null : (
                  // Short on screen, and the whole sentence on the accessible
                  // name — a switcher is not the place for three lines of prose.
                  <span className="in-lang__note">{t('language.approximateShort')}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className="in-lang__chevron"
      width="9"
      height="6"
      viewBox="0 0 9 6"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type { Locale };
