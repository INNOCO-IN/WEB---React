import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer, { type FooterProps } from './Footer';
import ContentStatus from './ContentStatus';
import type { Lang } from './nav-data';
import '../styles/site.css';

/**
 * The chrome every page sits inside: sticky nav, the page, ribbon footer.
 *
 * Two things the legacy pages did on <body> have to keep happening, because
 * their full-bleed sections rely on the page background rather than painting
 * it themselves: the per-page background colour, and the per-page font stack
 * (the Korean pages add Noto). Both arrive as props from the page component.
 */

export interface SiteLayoutProps {
  children: ReactNode;
  lang?: Lang;
  /** Legacy filename, kept so a page can be traced back to its source. */
  page?: string;
  /** Page background — the legacy pages set this on <body>. */
  background?: string;
  /** Page text colour — likewise. */
  color?: string;
  /** Scope class for this page's own stylesheet. */
  className?: string;
  /** Ribbon footer configuration, lifted off the page's <dc-import>. */
  footer?: Omit<FooterProps, 'lang'>;
  /** Document title for this page. */
  title?: string;
}

const KO_FONT = "'Newsreader', 'Noto Sans KR', Georgia, serif";
const EN_FONT = "'Newsreader', Georgia, 'Times New Roman', serif";

export default function SiteLayout({
  children,
  lang = 'EN',
  page,
  background = '#FAF4E2',
  color = '#2E3B40',
  className,
  footer,
  title,
}: SiteLayoutProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const { body, documentElement } = document;
    const previous = { background: body.style.background, color: body.style.color };

    body.style.background = background;
    body.style.color = color;
    documentElement.lang = lang === 'KO' ? 'ko' : 'en';

    return () => {
      body.style.background = previous.background;
      body.style.color = previous.color;
    };
  }, [background, color, lang]);

  useEffect(() => {
    document.title = title ?? 'IN — a studio where we practice being human together';
  }, [title]);

  // A router navigation keeps the scroll position by default, which lands you
  // halfway down a page you have never seen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="in-shell" style={{ fontFamily: lang === 'KO' ? KO_FONT : EN_FONT }}>
      <Nav lang={lang} />
      <div className={['in-page', className].filter(Boolean).join(' ')} data-page={page}>
        {children}
      </div>
      <Footer lang={lang} {...footer} />

      {/* The page's data model, as it is actually running. Development only:
          the branch is dead in a production build and the module has no side
          effects, so it is dropped rather than shipped. */}
      {import.meta.env.DEV ? <ContentStatus route={pathname} /> : null}
    </div>
  );
}
