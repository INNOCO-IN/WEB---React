import { Link } from 'react-router-dom';
import { useNews } from '../../lib/hooks/useContent';
import { accentColor, inLang, type Feed, type NewsItem } from '../../lib/content/types';
import { useTranslation } from 'react-i18next';
import { localize, useLocaleOr, type Locale } from '../../lib/lang';
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
  locale?: Locale;
  limit?: number;
}


export default function NewsGrid({ feed = 'news', locale: given, limit }: Props) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const { data: items } = useNews(feed, limit);

  if (!items.length) {
    return (
      <div className="in-wall">
        <p className="in-wall-empty">{t('cards.newsEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="in-wall">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} locale={locale} />
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
export function NewsCard({ item, locale: given }: { item: NewsItem; locale?: Locale }) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const accent = accentColor(item.accent, 'var(--color-tan)');
  const title = inLang(item.title, { ko: item.title_ko, 'zh-TW': item.title_zh_tw }, locale) ?? item.title;
  const eyebrow = inLang(item.eyebrow, { ko: item.eyebrow_ko, 'zh-TW': item.eyebrow_zh_tw }, locale);
  const blurb = inLang(item.body, { ko: item.body_ko, 'zh-TW': item.body_zh_tw }, locale);
  const kind = inLang(item.kind, { ko: item.kind_ko, 'zh-TW': item.kind_zh_tw }, locale);
  const meta = [formatDate(item.published_at, locale), eyebrow].filter(Boolean).join(' · ');
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
          {kind ? <span className="in-rail-label">{kind}</span> : null}
        </div>

        <div className="in-news-card__text">
          {meta ? <div className="in-news-card__meta">{meta}</div> : null}
          <h3 className="in-news-card__title">{title}</h3>
          {blurb ? <p className="in-news-card__blurb">{blurb}</p> : null}
          <div className="in-news-card__cta">
            {item.link ? t('cards.read') : t('cards.pageComing')}
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
          <Link className="in-news-card__link in-card in-plain" to={localize(item.link, locale)}>
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
