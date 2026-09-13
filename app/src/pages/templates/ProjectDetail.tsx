import { useParams } from 'react-router-dom';
import SiteLayout from '../../components/SiteLayout';
import ProjectIndexRail from '../../components/ProjectIndexRail';
import { BriefGrid, ClosingBand, DetailHero, DetailPage, InkLink } from '../../components/detail/parts';
import NotFound from '../NotFound';
import { PROJECT_DETAILS } from '../../lib/content/project-details';
import { accentColor } from '../../lib/content/types';
import { useProjects } from '../../lib/hooks/useContent';
import { useLocale } from '../../lib/lang';

/**
 * `/project/:slug` — a project, in full.
 *
 * Five pages used to render this. Project-CTN, Project-GYEM,
 * Project-I-Grow-Seed, Project-tasmena and Project-BridgeBuilder-Program were
 * the same markup five times over, differing only in the words: normalising
 * the strings out of them left files that were byte-identical apart from the
 * component name.
 *
 * So they are one route now, and the copy comes from two places:
 *
 * - The **`projects` row** carries what the card walls and the index rail
 *   already show — the title above all. Reading it here rather than freezing a
 *   copy means a title corrected in the Table Editor reaches this page too,
 *   and reaches it live, because `useProjects` stays subscribed.
 * - **`project-details.ts`** carries what only the full page shows: the chips,
 *   the lede, the fact cards. It is extracted from `site/` by
 *   scripts/extract-detail-pages.mjs, so the legacy page is still the thing
 *   you edit.
 *
 * The eight richer project pages — Asia Exchange, UNC, Jungle Jam and the rest
 * — keep their own components. Their routes are static, and React Router ranks
 * a static path above a dynamic one, so `/project/asia-exchange` never lands
 * here.
 *
 * It serves `/ko/project/:slug` as well since the 2026 design wrote a Korean
 * edition of all five. One component either way: a Korean brief that got its
 * own generated component would be five more pages saying what five pages
 * already say, and would stop reading the `projects` row while it did it.
 */
export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const locale = useLocale();
  // English is the fallback rather than a 404: a slug whose Korean page has
  // not been written is a page that exists, told in the language there is.
  const detail = PROJECT_DETAILS[`${slug}:${locale === 'ko' ? 'KO' : 'EN'}`] ?? PROJECT_DETAILS[`${slug}:EN`];
  const { data: projects } = useProjects();

  // A slug with no detail is a URL nobody published. NotFound already renders
  // the 404 inside the normal chrome, so a mistyped project still has a nav.
  if (!detail) return <NotFound />;

  // The row wins on title — but only where the row answers in the language
  // being read. `inLang` falls back to the row's English, which on a Korean
  // page would put an English headline over a Korean brief; the page's own
  // title is already in the right language, so it is the better fallback.
  const row = projects.find((project) => project.slug === slug);
  const fromRow = locale === 'ko' ? row?.title_ko : locale === 'zh-TW' ? row?.title_zh_tw : row?.title;
  const title = fromRow || detail.title || row?.title || '';

  const accent = accentColor(detail.accent, 'var(--color-gold)');
  const cta = accentColor(detail.ctaAccent, 'var(--color-slate)');

  return (
    <SiteLayout
      page={`Project-${slug}`}
      title={`${title} — IN`}
      className="page-project-detail"
      footer={{ loop: detail.loop ?? undefined, cta: detail.ctaAccent ? cta : undefined }}
    >
      <DetailPage accent={accent}>
        <DetailHero
          accent={accent}
          mode={detail.ink}
          back={detail.back ?? { label: '← All Projects', to: '/project' }}
          chips={detail.chips}
          title={title}
          lede={detail.lede}
        />

        {/* Two columns: the brief, and the index of every other project. */}
        <section className="in-detail__section">
          <div className="in-detail__grid">
            <div className="in-detail__col">
              <BriefGrid label={detail.briefLabel} facts={detail.brief} accent={accent} />
              {detail.link && (
                <div style={{ marginTop: '80px' }}>
                  <InkLink link={detail.link} />
                </div>
              )}
            </div>

            <aside className="in-detail__rail">
              <ProjectIndexRail current={slug} />
            </aside>
          </div>
        </section>

        <ClosingBand accent={cta} />
        <div id="connect" />
      </DetailPage>
    </SiteLayout>
  );
}
