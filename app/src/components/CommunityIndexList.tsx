import { Link } from 'react-router-dom';
import { useCommunities } from '../lib/hooks/useContent';
import { copyIn } from '../lib/content/types';
import type { Lang } from './nav-data';
import './CommunityIndexList.css';

/**
 * The full directory on /community/all, from the `communities` table.
 *
 * "Every community, in one place" was eight rows written into the page, which
 * is one fewer than the grid on /community shows and one short of the register:
 * the UAE Youth Cluster had a card and a page but no line in the directory.
 * Reading both from the same table is the only way "every" stays true.
 *
 * Each row is title plus `meta` — where the circle stands, not what it is. That
 * line is why the table needed a `meta` column: every circle's eyebrow says
 * "Community", and a directory of nine identical labels tells you nothing.
 */

interface Props {
  lang?: Lang;
}

export default function CommunityIndexList({ lang = 'EN' }: Props) {
  const { data: communities } = useCommunities();

  return (
    <div className="in-index">
      {communities.map((community) => {
        const copy = copyIn(community, lang);
        return (
          <Link
            key={community.slug}
            // `idx-row` is the page's own class: it carries the red hover tint
            // that belongs to this page rather than to the directory.
            className="in-index__row idx-row in-plain"
            to={community.route ?? `/community/${community.slug}`}
          >
            <span className="in-index__title">{copy.title}</span>
            {copy.meta ? <span className="in-index__meta">{copy.meta}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
