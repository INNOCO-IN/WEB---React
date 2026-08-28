import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV, type Lang } from './nav-data';
import { LANG_ALTERNATES } from '../lib/route-map';
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

interface Props {
  lang: Lang;
}

const GREY = 'rgba(46,59,64,0.55)';
const DARK = '#2E3B40';

export default function Nav({ lang }: Props) {
  const [hover, setHover] = useState<{ group: number; item: number } | null>(null);
  const { pathname } = useLocation();

  const groups = NAV[lang];
  const home = lang === 'KO' ? '/ko' : '/';
  const connect = lang === 'KO' ? '/ko/connect' : '/connect';
  const alt = LANG_ALTERNATES[pathname] ?? (lang === 'KO' ? '/' : '/ko');

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
        <Link to={home} className="in-nav__logo" aria-label="IN.studio — home">
          <img src="/IN_Logo.png" alt="IN.studio" />
        </Link>

        <nav className="in-nav__groups">
          {groups.map((group, gi) => {
            const groupHovered = hover?.group === gi;
            return (
              <div key={group.heading} className="in-nav__group" onMouseLeave={() => setHover(null)}>
                <div
                  className="in-nav__heading"
                  style={{ color: groupHovered ? DARK : GREY }}
                >
                  {group.heading}
                </div>

                <div className="in-nav__dots">
                  {group.items.map((item, ii) => {
                    const active = pathname === item.to;
                    const lit = groupHovered ? hover?.item === ii : active && !hover;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        aria-label={item.label}
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
                      const active = pathname === item.to;
                      const lit = groupHovered ? hover?.item === ii : active && !hover;
                      return (
                        <span key={item.to} className="in-nav__label" style={{ opacity: lit ? 1 : 0 }}>
                          {item.label}
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
          <div className="in-nav__lang">
            <span className="is-current">{lang === 'KO' ? 'KR' : 'EN'}</span>
            <span className="in-nav__lang-sep">/</span>
            <Link to={alt}>{lang === 'KO' ? 'EN' : 'KR'}</Link>
          </div>
          <Link to={connect} className="in-nav__cta">
            Are you IN?
          </Link>
        </div>
      </div>
    </header>
  );
}
