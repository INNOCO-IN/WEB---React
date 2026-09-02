import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './Nav';
import Footer, { type FooterProps } from './Footer';
import ContentStatus from './ContentStatus';
import { localeOf, type Locale } from '../lib/lang';
import { FONT_STACK } from '../i18n/locales';
import { syncHead } from '../lib/head';
import '../styles/site.css';

/**
 * The chrome every page sits inside: sticky nav, the page, ribbon footer.
 *
 * Two things the legacy pages did on <body> have to keep happening, because
 * their full-bleed sections rely on the page background rather than painting
 * it themselves: the per-page background colour, and the per-page font stack
 * (the Korean pages add Noto). Both arrive as props from the page component.
 *
 * Language does not, any more. Every generated page writes its own `lang` in,
 * and they all happen to be right, but the default was English — so a page
 * that forgot rendered an English shell around Korean copy and said nothing.
 * The route already knows, so the route decides and the prop is an override.
 */

export interface SiteLayoutProps {
  children: ReactNode;
  /** Overrides the locale the route implies. Almost nothing should need it. */
  locale?: Locale;
  /** Legacy filename, kept so a page can be traced back to its source. */
  page?: string;
  /** Page background — the legacy pages set this on <body>. */
  background?: string;
  /** Page text colour — likewise. */
  color?: string;
  /** Scope class for this page's own stylesheet. */
  className?: string;
  /** Ribbon footer configuration, lifted off the page's <dc-import>. */
  footer?: FooterProps;
  /** Document title for this page. Defaults to the section's name. */
  title?: string;
  /** Meta description for this page. Defaults to the brand line. */
  description?: string;
}

export default function SiteLayout({
  children,
  locale: localeProp,
  page,
  background = '#FAF4E2',
  color = '#2E3B40',
  className,
  footer,
  title,
  description,
}: SiteLayoutProps) {
  const { pathname } = useLocation();
  const locale = localeProp ?? localeOf(pathname);

  useEffect(() => {
    const { body } = document;
    const previous = { background: body.style.background, color: body.style.color };

    body.style.background = background;
    body.style.color = color;

    return () => {
      body.style.background = previous.background;
      body.style.color = previous.color;
    };
  }, [background, color]);

  useEffect(() => {
    syncHead({ pathname, locale, title, description });
  }, [pathname, locale, title, description]);

  // A router navigation keeps the scroll position by default, which lands you
  // halfway down a page you have never seen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="in-shell" style={{ fontFamily: FONT_STACK[locale] }}>
      <Nav />
      <div className={['in-page', className].filter(Boolean).join(' ')} data-page={page}>
        {children}
      </div>
      <Footer {...footer} />

      {/* The page's data model, as it is actually running. Development only:
          the branch is dead in a production build and the module has no side
          effects, so it is dropped rather than shipped. */}
      {import.meta.env.DEV ? <ContentStatus route={pathname} /> : null}
    </div>
  );
}
