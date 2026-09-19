import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkshops } from '../../lib/hooks/useContent';
import { workshopAudienceOrder } from '../../lib/content/workshops';
import { accentColor, inLang, type WorkshopCard as Workshop } from '../../lib/content/types';
import { useTranslation } from 'react-i18next';
import { localize, useLocaleOr, type Locale } from '../../lib/lang';
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
  locale?: Locale;
}


export default function WorkshopWall({ locale: given }: Props) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const { data: workshops } = useWorkshops();
  const [filter, setFilter] = useState<string | null>(null);

  const cards = useMemo(() => workshops.filter((w) => !w.featured), [workshops]);

  // Which audiences there are is derived from the rows, deduped — a fixed list
  // would go stale the moment someone adds a workshop for a new audience.
  // Their order is not derivable, so it comes from the design: the legacy page
  // writes For All, Parents, Organizations, Youth, Women, which is not the
  // order the cards happen to sit in. An audience the design has not placed
  // sorts to the end rather than disappearing.
  //
  // Key and label are separate: the filter matches on the English `audience`,
  // which is what every row carries, while the chip is labelled in the
  // language being read. Filtering on the label would break the moment one
  // row was translated and the next was not.
  const audiences = useMemo(() => {
    const seen = new Map<string, string>();
    for (const card of cards) {
      if (card.audience && !seen.has(card.audience)) {
        seen.set(card.audience, inLang(card.audience, { ko: card.audience_ko, 'zh-TW': card.audience_zh_tw }, locale) ?? card.audience);
      }
    }
    const rank = (key: string) => {
      const i = workshopAudienceOrder.indexOf(key);
      return i === -1 ? workshopAudienceOrder.length : i;
    };
    return [...seen]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => rank(a.key) - rank(b.key));
  }, [cards, locale]);

  const visible = filter ? cards.filter((card) => card.audience === filter) : cards;
  const allLabel = t('cards.allWorkshops');

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
            key={audience.key}
            type="button"
            className="in-ws-filter"
            aria-pressed={filter === audience.key}
            onClick={() => setFilter(audience.key)}
          >
            {audience.label}
          </button>
        ))}
      </div>

      <ul className="in-wall">
        {visible.map((workshop) => (
          <li key={workshop.slug}>
            <WorkshopCard workshop={workshop} locale={locale} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function WorkshopCard({ workshop, locale: given }: { workshop: Workshop; locale?: Locale }) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const title = inLang(workshop.title, { ko: workshop.title_ko, 'zh-TW': workshop.title_zh_tw }, locale) ?? workshop.title;
  const eyebrow = inLang(workshop.eyebrow, { ko: workshop.eyebrow_ko, 'zh-TW': workshop.eyebrow_zh_tw }, locale);
  const blurb = inLang(workshop.blurb, { ko: workshop.blurb_ko, 'zh-TW': workshop.blurb_zh_tw }, locale);
  const cta = inLang(workshop.cta, { ko: workshop.cta_ko, 'zh-TW': workshop.cta_zh_tw }, locale) ?? t('cards.explore');
  const background = accentColor(workshop.accent, 'var(--color-teal)');
  const onPaper = workshop.ink === 'paper';
  const ink = onPaper ? 'var(--color-paper)' : 'var(--color-ink)';
  const muted = onPaper ? 'rgba(250,244,226,0.86)' : 'rgba(46,59,64,0.82)';

  return (
    <Link
      to={localize(workshop.route ?? `/workshop/${workshop.slug}`, locale)}
      className="in-ws-card in-card in-plain"
    >
      <div className="in-ws-card__panel" style={{ background, color: ink }}>
        <div className="in-ws-card__rail">
          <span className="in-dot" style={{ background: ink }} />
          {eyebrow ? (
            <span className="in-rail-label" style={{ color: muted }}>
              {eyebrow}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="in-ws-card__title">{title}</h3>
          {blurb ? (
            <p className="in-ws-card__blurb" style={{ color: muted }}>
              {blurb}
            </p>
          ) : null}
        </div>

        <div className="in-ws-card__foot">
          <span className="in-ws-card__cta" style={{ color: muted }}>
            {cta}
          </span>
          <span className="in-arrow" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
