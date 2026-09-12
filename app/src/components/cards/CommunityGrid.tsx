import { Link } from 'react-router-dom';
import { useCommunities } from '../../lib/hooks/useContent';
import { accentColor, copyIn, type CommunityCard as Community } from '../../lib/content/types';
import { useTranslation } from 'react-i18next';
import { localize, useLocaleOr, type Locale } from '../../lib/lang';
import './cards.css';

/** The label the arrow carried as its aria-label on the legacy card. */

/**
 * The community circles, from the `communities` table.
 *
 * The whole card is the link now. On the legacy page only the small round
 * arrow in the corner was clickable — a 44px target at the bottom of a card
 * the size of a postcard.
 *
 * Two of the nine circles point at a project rather than a community page:
 * the community an intervention left behind is not the intervention. The row's
 * `route` decides, so the table can say so without the component knowing.
 */

interface Props {
  locale?: Locale;
}

export default function CommunityGrid({ locale: given }: Props) {
  const locale = useLocaleOr(given);
  const { data: communities } = useCommunities();

  if (!communities.length) return <div className="in-wall" />;

  return (
    <ul className="in-wall">
      {communities.map((community) => (
        <li key={community.slug}>
          <CommunityCard community={community} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

export function CommunityCard({ community, locale: given }: { community: Community; locale?: Locale }) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const accent = accentColor(community.accent, 'var(--color-teal)');
  const copy = copyIn(community, locale);

  return (
    <Link
      to={localize(community.route ?? `/community/${community.slug}`, locale)}
      className="in-community-card in-card in-plain"
      aria-label={`${t('cards.open')} — ${copy.title}`}
    >
      {community.image ? (
        <div className="in-community-card__photo">
          <img src={community.image} alt="" loading="lazy" />
        </div>
      ) : null}

      <div className="in-community-card__body">
        {copy.eyebrow ? (
          <div className="in-community-card__eyebrow">
            <span className="in-dot" style={{ background: accent }} />
            {copy.eyebrow}
          </div>
        ) : null}

        {copy.meta ? <div className="in-community-card__meta">{copy.meta}</div> : null}

        <h3 className="in-community-card__title">{copy.title}</h3>
        {copy.body ? <p className="in-community-card__blurb">{copy.body}</p> : null}

        <span className="in-community-card__foot" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}
