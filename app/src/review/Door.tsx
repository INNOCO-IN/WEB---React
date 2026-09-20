import type { ReactNode } from 'react';

/**
 * The frame around a screen you are not yet through.
 *
 * `parts.tsx` has a `Frame` already and it is the wrong one here: it carries a
 * "Back to the queue" link, and every screen in this file exists precisely
 * because there is no queue to go back to yet. Offering the way out before the
 * way in is how a door screen ends up with a dead link on it.
 *
 * 560px and generous gutters — the screens allowed to be nearly empty. Two use
 * it: the mailed link, and the code that follows it.
 */
export function Door({ children }: { children: ReactNode }) {
  return (
    <div className="rv-page rv-page--narrow">
      <header style={{ paddingBottom: '28px', borderBottom: '1px solid var(--rv-teal)', marginBottom: '38px' }}>
        <span className="rv-label rv-eyebrow">IN · Internal</span>
        <h1 className="rv-title">Review desk</h1>
        <p className="rv-secondary rv-muted" style={{ paddingTop: '14px' }}>
          Where we read what people sent us.
        </p>
      </header>
      {children}
    </div>
  );
}
