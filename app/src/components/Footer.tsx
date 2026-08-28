import { Link, useLocation } from 'react-router-dom';
import { FOOTER_LINKS, SOCIAL, type Lang } from './nav-data';
import { LANG_ALTERNATES } from '../lib/route-map';
import './Footer.css';

/**
 * The ribbon footer.
 *
 * The loop in the ribbon sits at a different point on each page — that is the
 * `loop` prop, 0–1 across the width — and the band above it takes the page's
 * key colour via `cta`. The stroke flips between paper and ink so it stays
 * legible on whichever band colour it crosses, which is the one bit of real
 * logic here.
 */

export interface FooterProps {
  lang?: Lang;
  /** Where the loop sits, 0 (left) to 1 (right). */
  loop?: string | number;
  /** Band colour behind the ribbon — the page's key accent. */
  cta?: string;
  /** Overrides the automatic stroke colour. */
  stroke?: string;
}

const PAPER = '#FAF4E2';
const INK = '#2E3B40';

/** Perceived brightness, to decide whether the ribbon reads as paper or ink. */
function isDark(hex: string): boolean {
  const value = hex.replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

/** The ribbon path, with its loop centred at `x`. */
function ribbonPath(x: number): string {
  return (
    `M0 60 L${x - 70} 60 ` +
    `C${x - 34} 60 ${x - 24} 53 ${x - 19} 53 ` +
    `C${x + 11} 44 ${x + 17} 22 ${x} 21 ` +
    `C${x - 17} 20 ${x - 19} 41 ${x + 3} 50 ` +
    `C${x + 10} 55 ${x + 34} 60 ${x + 70} 60 L1500 60`
  );
}

export default function Footer({ lang = 'EN', loop, cta, stroke }: FooterProps) {
  const { pathname } = useLocation();

  const parsed = typeof loop === 'number' ? loop : parseFloat(loop ?? '');
  const position = Math.max(0, Math.min(1, Number.isNaN(parsed) ? 0.15 : parsed));
  const x = Math.round(150 + position * 1200);

  const hasBand = Boolean(cta && cta !== 'false');
  const bandFill = hasBand ? (cta as string) : PAPER;
  const strokeColor = stroke ?? (hasBand && isDark(bandFill) ? PAPER : INK);

  const columns = FOOTER_LINKS[lang];
  const alt = LANG_ALTERNATES[pathname] ?? (lang === 'KO' ? '/' : '/ko');

  return (
    <footer className="in-footer">
      <div className="in-foot-loop">
        <svg viewBox="0 0 1500 120" width="100%" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0" y="0" width="1500" height="60" fill={bandFill} />
          <rect x="0" y="60" width="1500" height="60" fill={PAPER} />
          <path
            className="ribbon-stroke"
            d={ribbonPath(x)}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="in-footer__inner">
        <div className="in-footer__grid">
          {columns.map((column, i) => (
            <div className="in-footer__col" key={i}>
              {column.map((link) => (
                <Link key={link.to} to={link.to} className="in-footer__link">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          <div />

          <div className="in-footer__social">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                {...(s.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}
              >
                <SocialIcon name={s.label} />
              </a>
            ))}
          </div>
        </div>

        <div className="in-footer__rule" />

        <div className="in-footer__base">
          <div className="in-footer__legal">
            © 2016–2026 IN (INNOCO) · Seoul, Korea · MEWE shared under CC BY-NC-SA 4.0
          </div>
          <div className="in-footer__lang">
            <span className="is-current">{lang === 'KO' ? 'KR' : 'EN'}</span>
            <span className="in-footer__lang-sep">/</span>
            <Link to={alt}>{lang === 'KO' ? 'EN' : 'KR'}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  } as const;

  if (name === 'X') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  const line = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;

  if (name === 'Email') {
    return (
      <svg {...common} {...line}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 6 10 7 10-7" />
      </svg>
    );
  }

  if (name === 'Instagram') {
    return (
      <svg {...common} {...line}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg {...common} {...line}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
