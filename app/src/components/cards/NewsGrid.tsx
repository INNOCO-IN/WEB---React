import { Link } from 'react-router-dom';
import { useNews } from '../../lib/hooks/useContent';
import { accentColor, type Feed, type NewsItem } from '../../lib/content/types';
import type { Lang } from '../nav-data';
import { formatDate } from '../../lib/format';
import './cards.css';

/**
 * The news wall, from the `news` table.
 *
 * Replaces fifteen hand-written cards on News.EN and six more on Community.EN,
 * which had already drifted out of step with data/site-news.csv — the register
 * that was supposed to be the source of truth. Now the register is the table
 * and there is only one copy.
 */

interface Props {
  /** Which list to draw: the News page, the Community page, the Home grid. */
  feed?: Feed;
  lang?: Lang;
  limit?: number;
}

const EMPTY: Record<string, string> = {
  EN: 'Nothing here yet — the next entry is being written.',
  KO: '아직 소식이 없습니다.',
};

export default function NewsGrid({ feed = 'news', lang = 'EN', limit }: Props) {
  const { data: items } = useNews(feed, limit);

  if (!items.length) {
    return (
      <div className="in-wall">
        <p className="in-wall-empty">{EMPTY[lang] ?? EMPTY.EN}</p>
      </div>
    );
  }

  return (
    <div className="in-wall">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} lang={lang} />
      ))}
    </div>
  );
}

/**
 * One card. Linked when the row names a destination, inert when it does not.
 *
 * The photo credit sits outside the card's own link rather than inside it.
 * A photographer's attribution has to be clickable to be an attribution, and
 * an anchor inside an anchor is invalid — browsers recover by closing the
 * outer one early, which silently unlinks the rest of the card.
 */
export function NewsCard({ item, lang = 'EN' }: { item: NewsItem; lang?: Lang }) {
  const accent = accentColor(item.accent, 'var(--color-tan)');
  const meta = [formatDate(item.published_at, lang), item.eyebrow].filter(Boolean).join(' · ');
  const external = item.link ? /^https?:/.test(item.link) : false;

  const body = (
    <>
      {item.image ? (
        <div className="in-news-card__photo">
          <img src={item.image} alt="" loading="lazy" />
        </div>
      ) : (
        <div className="in-news-card__bar" style={{ background: accent }} />
      )}

      <div className="in-news-card__body">
        <div className="in-news-card__rail">
          <span className="in-dot" style={{ background: accent }} />
          {item.kind ? <span className="in-rail-label">{item.kind}</span> : null}
        </div>

        <div className="in-news-card__text">
          {meta ? <div className="in-news-card__meta">{meta}</div> : null}
          <h3 className="in-news-card__title">{item.title}</h3>
          {item.body ? <p className="in-news-card__blurb">{item.body}</p> : null}
          <div className="in-news-card__cta">
            {item.link ? (lang === 'KO' ? '읽기' : 'Read') : lang === 'KO' ? '준비 중' : 'Page coming'}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <article className="in-news-card">
      {item.link ? (
        external ? (
          <a className="in-news-card__link in-card in-plain" href={item.link} target="_blank" rel="noopener noreferrer">
            {body}
          </a>
        ) : (
          <Link className="in-news-card__link in-card in-plain" to={item.link}>
            {body}
          </Link>
        )
      ) : (
        body
      )}

      {item.credit ? (
        <div className="in-news-card__credit">
          {item.credit_href ? (
            <a href={item.credit_href} target="_blank" rel="noopener noreferrer">
              {item.credit}
            </a>
          ) : (
            item.credit
          )}
        </div>
      ) : null}
    </article>
  );
}
