import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import '../i18n';

// jsdom has no layout, so it has no scrollTo. SiteLayout calls it on every
// navigation; stubbing it keeps the run's output about the tests.
window.scrollTo = () => {};

/**
 * `findBy*` waits one second by default, which is not enough here.
 *
 * Every route is a `React.lazy` import, so the first `findByRole` on a page is
 * waiting for Vitest to transform and import that page's whole module graph —
 * around 300–480ms on an idle machine. That fits inside a second with no room
 * to spare, and the room runs out when the suite shares the machine with
 * something else: both observed failures happened while `tsc`, `oxlint` and
 * `vite build` were running in the same chained command, and none happened in
 * fifteen runs of the suite on its own.
 *
 * So this is a slow import, not a slow assertion, and five seconds is the
 * headroom for it. It does not make a genuinely broken test pass — a page that
 * never renders still fails, five seconds later.
 */
configure({ asyncUtilTimeout: 5000 });
