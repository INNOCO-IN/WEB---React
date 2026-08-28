import { Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { PAGES } from './pages/registry';
import { LEGACY_ROUTES } from './lib/route-map';
import NotFound from './pages/NotFound';

/**
 * The router.
 *
 * Every page is a clean path — `/workshop/mobius-making`, `/ko/news` — and
 * every URL the static site used to serve is kept alive as a redirect. Both
 * tables are generated from `site/` by scripts/convert-pages.mjs, so adding a
 * page is a re-run rather than an edit here.
 */

/**
 * `/Workshop.EN.dc.html` → `/workshop`.
 *
 * This sits on the single-segment `/:file` pattern, which React Router only
 * reaches after every static path has failed to match — so a real route never
 * lands here, and anything that does is either an old filename or a typo.
 */
function LegacyRedirect() {
  const { file = '' } = useParams();
  const target = LEGACY_ROUTES[decodeURIComponent(file)];
  return target ? <Navigate to={target} replace /> : <NotFound />;
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <Routes>
        {Object.entries(PAGES).map(([path, Page]) => (
          <Route key={path} path={path} element={<Page />} />
        ))}

        <Route path="/:file" element={<LegacyRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
