import { useParams } from 'react-router-dom';
import SiteLayout from '../../components/SiteLayout';
import { BriefGrid, ClosingBand, DetailHero, DetailPage, InkLink } from '../../components/detail/parts';
import NotFound from '../NotFound';
import { COMMUNITY_DETAILS } from '../../lib/content/community-details';
import { accentColor } from '../../lib/content/types';
import { useLocale } from '../../lib/lang';

/**
 * `/community/:slug` — one circle, in full.
 *
 * Seven pages used to render this, five of them byte-identical once the
 * strings were normalised out. The two that were not — Animators and Open
 * Studio — differed by the one thing this template makes optional: whether the
 * page sends you on to the project that called the circle into being.
 *
 * Unlike the project template, the title here is the page's own rather than
 * the row's. The two genuinely differ: the `communities` row calls this
 * circle "BridgeBuilder Community", because a card in a directory needs the
 * noun; the page calls it "BridgeBuilders", because by then you know what you
 * are looking at. Reading the row here would overwrite the shorter one.
 *
 * The copy is extracted from `site/` by scripts/extract-detail-pages.mjs, so
 * the legacy page is still the thing you edit.
 *
 * It serves `/ko/community/:slug` too, since the 2026 design wrote a Korean
 * edition of all seven. The record is keyed `slug:lang`, and the way back to
 * the index travels with it rather than being written here, where it could
 * only ever have been English.
 */
export default function CommunityDetail() {
  const { slug = '' } = useParams();
  const locale = useLocale();
  // English is the fallback rather than a 404: a slug whose Korean page has
  // not been written is a page that exists, told in the language there is.
  const detail =
    COMMUNITY_DETAILS[`${slug}:${locale === 'ko' ? 'KO' : 'EN'}`] ?? COMMUNITY_DETAILS[`${slug}:EN`];

  if (!detail) return <NotFound />;

  const accent = accentColor(detail.accent, 'var(--color-red)');
  const cta = accentColor(detail.ctaAccent, accent);

  return (
    <SiteLayout
      page={`Community-${slug}`}
      title={`${detail.title} — IN`}
      className="page-community-detail"
      footer={{ loop: detail.loop ?? undefined, cta: detail.ctaAccent ? cta : undefined }}
    >
      <DetailPage accent={accent}>
        <DetailHero
          accent={accent}
          mode={detail.ink}
          back={detail.back ?? { label: '← All Communities', to: '/community' }}
          chips={detail.chips}
          chipStyle="status"
          title={detail.title}
          lede={detail.lede}
        />

        <section className="in-detail__section">
          <BriefGrid label={detail.briefLabel} facts={detail.brief} accent={accent} />
        </section>

        {detail.link && (
          <section className="in-detail__section">
            <InkLink link={detail.link} />
          </section>
        )}

        <ClosingBand accent={cta} />
        <div id="connect" />
      </DetailPage>
    </SiteLayout>
  );
}
