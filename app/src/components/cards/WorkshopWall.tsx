import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkshops } from '../../lib/hooks/useContent';
import { accentColor, type WorkshopCard as Workshop } from '../../lib/content/types';
import type { Lang } from '../nav-data';
import './cards.css';

/**
 * The workshop wall and its audience filter, from the `workshops` table.
 *
 * The filter used to be a fixed array of nine booleans in the page's script,
 * positionally matched to nine hard-coded cards — adding a workshop meant
 * editing both, in step. Here the chips are derived from the audiences the
 * rows actually carry, so a new workshop brings its own filter with it.
 *
 * The featured row is drawn by the page above this wall, so it is filtered out.
 */

interface Props {
  lang?: Lang;
}

const ALL: Record<string, string> = { EN: 'All workshops', KO: '전체 워크숍' };

export default function WorkshopWall({ lang = 'EN' }: Props) {
  const { data: workshops } = useWorkshops();
  const [filter, setFilter] = useState<string | null>(null);

  const cards = useMemo(() => workshops.filter((w) => !w.featured), [workshops]);

  // Audiences in the order the cards appear, deduped — a fixed list would go
  // stale the moment someone adds a workshop for a new audience.
  const audiences = useMemo(() => {
    const seen: string[] = [];
    for (const card of cards) {
      if (card.audience && !seen.includes(card.audience)) seen.push(card.audience);
    }
    return seen;
  }, [cards]);

  const visible = filter ? cards.filter((card) => card.audience === filter) : cards;
  const allLabel = ALL[lang] ?? ALL.EN;

  return (
    <>
      <div className="in-ws-filters">
        <button
          type="button"
          className="in-ws-filter"
          aria-pressed={filter === null}
          onClick={() => setFilter(null)}
        >
          {allLabel}
        </button>
        {audiences.map((audience) => (
          <button
            key={audience}
            type="button"
            className="in-ws-filter"
            aria-pressed={filter === audience}
            onClick={() => setFilter(audience)}
          >
            {audience}
          </button>
        ))}
      </div>

      <div className="in-wall">
        {visible.map((workshop) => (
          <WorkshopCard key={workshop.slug} workshop={workshop} />
        ))}
      </div>
    </>
  );
}

export function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const background = accentColor(workshop.accent, 'var(--color-teal)');
  const onPaper = workshop.ink === 'paper';
  const ink = onPaper ? 'var(--color-paper)' : 'var(--color-ink)';
  const muted = onPaper ? 'rgba(250,244,226,0.86)' : 'rgba(46,59,64,0.82)';

  return (
    <Link
      to={workshop.route ?? `/workshop/${workshop.slug}`}
      className="in-ws-card in-card in-plain"
    >
      <div className="in-ws-card__panel" style={{ background, color: ink }}>
        <div className="in-ws-card__rail">
          <span className="in-dot" style={{ background: ink }} />
          {workshop.eyebrow ? (
            <span className="in-rail-label" style={{ color: muted }}>
              {workshop.eyebrow}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="in-ws-card__title">{workshop.title}</h3>
          {workshop.blurb ? (
            <p className="in-ws-card__blurb" style={{ color: muted }}>
              {workshop.blurb}
            </p>
          ) : null}
        </div>

        <div className="in-ws-card__foot">
          <span className="in-ws-card__cta" style={{ color: muted }}>
            {workshop.cta ?? 'Explore'}
          </span>
          <span className="in-arrow" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
