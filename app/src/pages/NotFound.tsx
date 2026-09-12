import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteLayout from '../components/SiteLayout';
import { localize, useLocale } from '../lib/lang';

/**
 * Kept in the site's own voice rather than a bare 404, and inside the normal
 * chrome, so a mistyped URL still gives you the nav to get somewhere real.
 *
 * It used to declare itself English, which meant a mistyped `/ko/` URL — or a
 * locale with no page at that address — answered in English, inside an English
 * nav, with a language switch that then sent you to the Korean home page. The
 * route still says which language you were reading, so the page says it too.
 */
export default function NotFound() {
  const locale = useLocale();
  const { t } = useTranslation();

  return (
    <SiteLayout title={t('notFound.title')} footer={{ loop: '0.5' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '120px 40px 140px' }}>
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
          {t('notFound.eyebrow')}
        </div>

        <h1
          style={{
            font: 'var(--text-display-3)',
            fontFamily: 'var(--font-serif)',
            margin: '0 0 20px',
          }}
        >
          {t('notFound.heading')}
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
          {t('notFound.body')}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
          <Link
            to={localize('/', locale)}
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
            {t('notFound.home')}
          </Link>
          <Link
            to={localize('/workshop', locale)}
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
            {t('notFound.workshops')}
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
