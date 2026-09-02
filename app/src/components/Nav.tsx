import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_GROUPS } from './nav-data';
import LanguageSwitcher from './LanguageSwitcher';
import { localeHome, localize, useLocale } from '../lib/lang';
import './Nav.css';

/**
 * The sticky header.
 *
 * Each nav group is a row of coloured dots with one shared label slot beneath
 * it: hovering a dot lights it in that page's key colour and swaps the label.
 * With no hover, the dot for the current page stays lit — which is how the nav
 * shows where you are.
 *
 * On touch, where there is no hover, the first tap lights the dot and reveals
 * the label and the second tap follows the link.
 */

const GREY = 'rgba(46,59,64,0.55)';
const DARK = '#2E3B40';

export default function Nav() {
  const [hover, setHover] = useState<{ group: number; item: number } | null>(null);
  const { pathname } = useLocation();
  const locale = useLocale();
  const { t } = useTranslation();

  const groups = NAV_GROUPS;
  const home = localeHome(locale);
  const connect = localize('/connect', locale);

  const canHover =
    typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches !== false;

  function onDotClick(event: React.MouseEvent, group: number, item: number) {
    if (canHover) return;
    const alreadyLit = hover?.group === group && hover?.item === item;
    if (!alreadyLit) {
      event.preventDefault();
      setHover({ group, item });
    }
  }

  return (
    <header className="in-nav">
      <div className="in-nav__inner">
        <Link to={home} className="in-nav__logo" aria-label={t('brand.logoLabel')}>
          <img src="/IN_Logo.png" alt="IN.studio" />
        </Link>

        <nav className="in-nav__groups">
          {groups.map((group, gi) => {
            const groupHovered = hover?.group === gi;
            return (
              <div key={group.key} className="in-nav__group" onMouseLeave={() => setHover(null)}>
                <div
                  className="in-nav__heading"
                  style={{ color: groupHovered ? DARK : GREY }}
                >
                  {t(`nav.groups.${group.key}`)}
                </div>

                <div className="in-nav__dots">
                  {group.items.map((item, ii) => {
                    const to = localize(item.to, locale);
                    const active = pathname === to;
                    const lit = groupHovered ? hover?.item === ii : active && !hover;
                    return (
                      <Link
                        key={item.key}
                        to={to}
                        aria-label={t(`nav.items.${item.key}`)}
                        aria-current={active ? 'page' : undefined}
                        className="in-nav__dot-link"
                        onMouseEnter={() => setHover({ group: gi, item: ii })}
                        onClick={(e) => onDotClick(e, gi, ii)}
                      >
                        <span
                          className="in-nav__dot"
                          style={{ background: lit ? item.color : GREY }}
                        />
                      </Link>
                    );
                  })}

                  <span className="in-nav__labels">
                    {group.items.map((item, ii) => {
                      const active = pathname === localize(item.to, locale);
                      const lit = groupHovered ? hover?.item === ii : active && !hover;
                      return (
                        <span key={item.key} className="in-nav__label" style={{ opacity: lit ? 1 : 0 }}>
                          {t(`nav.items.${item.key}`)}
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="in-nav__end">
          <LanguageSwitcher idPrefix="nav" className="in-nav__lang" />

          <Link to={connect} className="in-nav__cta">
            {t('nav.items.connect')}
          </Link>
        </div>
      </div>
    </header>
  );
}
