import { useParams } from 'react-router-dom';
import SiteLayout from '../../components/SiteLayout';
import ProjectIndexRail from '../../components/ProjectIndexRail';
import { BriefGrid, ClosingBand, DetailHero, DetailPage, InkLink } from '../../components/detail/parts';
import NotFound from '../NotFound';
import { PROJECT_DETAILS } from '../../lib/content/project-details';
import { accentColor } from '../../lib/content/types';
import { useProjects } from '../../lib/hooks/useContent';

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
 */
export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const detail = PROJECT_DETAILS[slug];
  const { data: projects } = useProjects();

  // A slug with no detail is a URL nobody published. NotFound already renders
  // the 404 inside the normal chrome, so a mistyped project still has a nav.
  if (!detail) return <NotFound />;

  // The row wins on title; everything else on this page is the page's own.
  const title = projects.find((project) => project.slug === slug)?.title || detail.title;

  const accent = accentColor(detail.accent, 'var(--color-gold)');
  const cta = accentColor(detail.ctaAccent, 'var(--color-slate)');

  return (
    <SiteLayout
      lang="EN"
      page={`Project-${slug}`}
      title={`${title} — IN`}
      className="page-project-detail"
      footer={{ loop: detail.loop ?? undefined, cta: detail.ctaAccent ? cta : undefined }}
    >
      <DetailPage accent={accent}>
        <DetailHero
          accent={accent}
          mode={detail.ink}
          back={{ label: '← All Projects', to: '/project' }}
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
