import { Link } from 'react-router-dom';
import { useNews } from '../../lib/hooks/useContent';
import { accentColor, inLang } from '../../lib/content/types';
import { formatDate } from '../../lib/format';
import { useTranslation } from 'react-i18next';
import { localize, useLocaleOr, type Locale } from '../../lib/lang';
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
  locale?: Locale;
}


export default function HomeNewsCard({ locale: given }: Props) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const { data } = useNews('home', 1);
  const item = data[0];

  const newsIndex = localize('/news', locale);
  if (!item) {
    return <Link to={newsIndex} className="in-home-tile in-card in-plain" />;
  }

  const accent = accentColor(item.accent, 'var(--color-tan)');
  // The wall next door resolves its copy per locale; this tile did not, so a
  // Korean home page led with an English headline even once the row had been
  // translated. Same rule as NewsGrid — field by field, English where a
  // translation is missing.
  const title = inLang(item.title, { ko: item.title_ko, 'zh-TW': item.title_zh_tw }, locale) ?? item.title;
  const blurb = inLang(item.body, { ko: item.body_ko, 'zh-TW': item.body_zh_tw }, locale);

  return (
    <Link to={localize(item.link ?? newsIndex, locale)} className="in-home-tile in-card in-plain">
      <div className="in-home-tile__bar" style={{ background: accent }}>
        <div className="in-home-tile__wedge">
          <div style={{ position: 'absolute', inset: 0, background: '#FAB414', clipPath: 'polygon(0 100%, 0 40%, 54% 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: '#FAB414', clipPath: 'polygon(100% 100%, 100% 18%, 58% 100%)', mixBlendMode: 'multiply' }} />
        </div>
      </div>

      <div className="in-home-tile__body">
        <div className="in-home-tile__rail">
          <span className="in-dot" style={{ background: accent }} />
          <span className="in-rail-label">{t('cards.newsIndex')}</span>
        </div>

        <div className="in-home-tile__date" style={{ color: accent }}>
          {formatDate(item.published_at, locale)}
        </div>
        <div className="in-home-tile__title">{title}</div>
        {blurb ? <p className="in-home-tile__blurb">{blurb}</p> : null}

        <span className="in-home-tile__arrow" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}
