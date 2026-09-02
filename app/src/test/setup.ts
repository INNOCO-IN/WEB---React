import '@testing-library/jest-dom/vitest';
import '../i18n';

// jsdom has no layout, so it has no scrollTo. SiteLayout calls it on every
// navigation; stubbing it keeps the run's output about the tests.
window.scrollTo = () => {};
