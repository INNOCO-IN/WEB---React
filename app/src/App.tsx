import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PAGES } from './pages/registry';
import { LEGACY_ROUTES } from './lib/route-map';
import NotFound from './pages/NotFound';
import BuilderPageView from './builder/BuilderPageView';
import { matchBuilderPath } from './builder/routes';
import {
  isRoute,
  localeHome,
  localeOf,
  pathIn,
  preferredLocale,
  stripLocale,
} from './lib/lang';
import { DEFAULT_LOCALE } from './i18n/locales';

/** Lazy, so the staff tool and the auth client stay out of the site's bundle. */
const Review = lazy(() => import('./pages/Review'));

/**
 * The router.
 *
 * Every page is a clean path — `/workshop/mobius-making`, `/ko/news` — and
 * every URL the static site used to serve is kept alive as a redirect. Both
 * tables are generated from `site/` by scripts/convert-pages.mjs, so adding a
 * page is a re-run rather than an edit here.
 *
 * Four things can be at the end of a URL, and they are tried in this order:
 * a converted page (a literal route, which React Router ranks first), a
 * locale spelling that needs normalising, a builder page, and an old
 * `*.dc.html` filename. Only then is it a 404.
 */

export default function App() {
  return (
    <>
      <LocaleSync />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <Routes>
          {Object.entries(PAGES).map(([path, Page]) => (
            <Route key={path} path={path} element={<Page />} />
          ))}

          {/*
            The review desk is written here rather than in the registry because
            the registry is generated from `site/` and would drop it on the next
            run. It is also not a page of the site: no locale, no nav, nothing
            links to it, and it is `noindex`. See pages/Review.tsx.
          */}
          <Route path="/review" element={<Review />} />

          <Route path="*" element={<Unmatched />} />
        </Routes>
      </Suspense>
    </>
  );
}

/**
 * Keeps i18next and the URL in agreement, and honours a saved preference once.
 *
 * The URL is the authority, so this only ever follows it. The one exception is
 * the very first load at the bare root: someone who has chosen Korean before
 * and typed the domain should land on the Korean home, which is the "saved
 * preference" step of the locale chain. It fires once, never on a deep link,
 * and never after the visitor has navigated — otherwise going Back would be a
 * trap.
 */
function LocaleSync() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = localeOf(pathname);

  useEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [i18n, locale]);

  useEffect(() => {
    if (window.location.pathname !== '/') return;
    const preferred = preferredLocale();
    if (preferred === DEFAULT_LOCALE) return;
    const home = localeHome(preferred);
    if (isRoute(home)) navigate(home, { replace: true });
    // Deliberately once, on mount: this is "where should an arrival with no
    // locale in the URL land", not a rule that follows you around the site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Everything the static routes did not claim.
 *
 * `/en/news` and `/zh-Hant/news` are understood but are not how this site
 * spells its URLs, so they are redirected rather than served — two addresses
 * for one page is a canonical-tag problem and a duplicate-content problem, and
 * the fix is to have one.
 */
function Unmatched() {
  const { pathname, search, hash } = useLocation();

  const trimmed = pathname.replace(/\/+$/, '') || '/';
  const canonical = pathIn(trimmed, localeOf(trimmed));
  if (canonical !== trimmed) {
    return <Navigate to={`${canonical}${search}${hash}`} replace />;
  }

  const built = matchBuilderPath(trimmed);
  if (built) return <BuilderPageView page={built.page} locale={built.locale} />;

  // `/Workshop.EN.dc.html` → `/workshop`. Only a single segment can be an old
  // filename, and the leading slash is dropped before the lookup.
  const { path } = stripLocale(trimmed);
  const file = decodeURIComponent(path.slice(1));
  const legacy = file && !file.includes('/') ? LEGACY_ROUTES[file] : undefined;
  if (legacy) return <Navigate to={legacy} replace />;

  return <NotFound />;
}
