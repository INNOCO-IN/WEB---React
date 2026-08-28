import { Link } from 'react-router-dom';
import { useNews } from '../../lib/hooks/useContent';
import { accentColor } from '../../lib/content/types';
import { formatDate } from '../../lib/format';
import type { Lang } from '../nav-data';
import './cards.css';

/**
 * The news tile in the home grid — the newest item on the `home` feed.
 *
 * It was hard-coded markup, which is why the home page still announced a
 * September date months after the item it described. One row, marked `home`
 * in the register, now decides what the front page leads with.
 *
 * It keeps the shape of the tiles around it rather than reusing the news-wall
 * card: this row of the grid is a set of matched panels, and a card that
 * looked like the News page inside it would read as a different site.
 */

interface Props {
  lang?: Lang;
}

const READ_MORE: Record<string, string> = { EN: 'News', KO: '소식' };

export default function HomeNewsCard({ lang = 'EN' }: Props) {
  const { data } = useNews('home', 1);
  const item = data[0];

  const newsIndex = lang === 'KO' ? '/ko/news' : '/news';
  if (!item) {
    return <Link to={newsIndex} className="in-home-tile in-card in-plain" />;
  }

  const accent = accentColor(item.accent, 'var(--color-tan)');

  return (
    <Link to={item.link ?? newsIndex} className="in-home-tile in-card in-plain">
      <div className="in-home-tile__bar" style={{ background: accent }}>
        <div className="in-home-tile__wedge">
          <div style={{ position: 'absolute', inset: 0, background: '#FAB414', clipPath: 'polygon(0 100%, 0 40%, 54% 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: '#FAB414', clipPath: 'polygon(100% 100%, 100% 18%, 58% 100%)', mixBlendMode: 'multiply' }} />
        </div>
      </div>

      <div className="in-home-tile__body">
        <div className="in-home-tile__rail">
          <span className="in-dot" style={{ background: accent }} />
          <span className="in-rail-label">{READ_MORE[lang] ?? READ_MORE.EN}</span>
        </div>

        <div className="in-home-tile__date" style={{ color: accent }}>
          {formatDate(item.published_at, lang)}
        </div>
        <div className="in-home-tile__title">{item.title}</div>
        {item.body ? <p className="in-home-tile__blurb">{item.body}</p> : null}

        <span className="in-home-tile__arrow" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}
