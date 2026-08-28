import { Link } from 'react-router-dom';
import SiteLayout from '../components/SiteLayout';

/**
 * Kept in the site's own voice rather than a bare 404, and inside the normal
 * chrome, so a mistyped URL still gives you the nav to get somewhere real.
 */
export default function NotFound() {
  return (
    <SiteLayout lang="EN" title="Not found — IN" footer={{ loop: '0.5' }}>
      <main
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '120px 40px 140px',
        }}
      >
        <div
          style={{
            font: 'var(--text-eyebrow)',
            fontFamily: 'var(--font-sans)',
            letterSpacing: 'var(--tracking-eyebrow)',
            textTransform: 'uppercase',
            color: 'var(--color-magenta)',
            marginBottom: '18px',
          }}
        >
          Not found
        </div>

        <h1
          style={{
            font: 'var(--text-display-3)',
            fontFamily: 'var(--font-serif)',
            margin: '0 0 20px',
          }}
        >
          This page isn't part of the pattern.
        </h1>

        <p
          style={{
            font: 'var(--text-body-lg)',
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-ink-40)',
            margin: '0 0 36px',
            maxWidth: '52ch',
          }}
        >
          The address you followed doesn't lead anywhere on the site. It may have
          moved, or it may never have existed.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              font: 'var(--text-button)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-paper)',
              background: 'var(--color-ink)',
              border: 'var(--border-width) solid var(--color-ink)',
              borderRadius: 'var(--radius-pill)',
              padding: '15px 32px',
            }}
          >
            Back to the studio
          </Link>
          <Link
            to="/workshop"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              font: 'var(--text-button)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-ink)',
              border: 'var(--border-width) solid rgba(46,59,64,0.35)',
              borderRadius: 'var(--radius-pill)',
              padding: '15px 32px',
            }}
          >
            See the workshops
          </Link>
        </div>
      </main>
    </SiteLayout>
  );
}
