import { Link } from 'react-router-dom';
import { useProjects } from '../../lib/hooks/useContent';
import { copyIn } from '../../lib/content/types';
import type { ProjectCard as Project } from '../../lib/content/types';
import { useTranslation } from 'react-i18next';
import { localize, useLocaleOr, type Locale } from '../../lib/lang';
import './cards.css';

/**
 * The project briefs, from the `projects` table.
 *
 * The index page used to write its own cards — seven of them, while the table
 * and every rail knew about eight, and the site had thirteen project pages. So
 * five finished projects were listed nowhere and reachable only by typing the
 * URL. Reading the wall from the table makes that class of bug impossible: a
 * project is on the index because it is in the register.
 *
 * The featured project is drawn by the page in its own block above this wall,
 * so it is filtered out here — the same division WorkshopWall keeps.
 */

interface Props {
  locale?: Locale;
}

/** The vertical rail label, and what the arrow says to a screen reader. */

export default function ProjectWall({ locale: given }: Props) {
  const locale = useLocaleOr(given);
  const { data: projects } = useProjects();
  const cards = projects.filter((project) => !project.featured);

  if (!cards.length) return <div className="in-wall" />;

  return (
    <ul className="in-wall">
      {cards.map((project) => (
        <li key={project.slug}>
          <ProjectBrief project={project} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

export function ProjectBrief({ project, locale: given }: { project: Project; locale?: Locale }) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const copy = copyIn(project, locale);
  // The card's small line is the eyebrow — 'Zayed University, UAE · Since
  // 2016'. The rail's shorter label stands in for a row that has no eyebrow.
  const label = copy.eyebrow ?? copy.meta;

  return (
    <Link
      to={localize(project.route ?? `/project/${project.slug}`, locale)}
      className="in-project-card in-card in-plain"
      aria-label={`${t('cards.open')} — ${copy.title}`}
    >
      <div className="in-project-card__bar" />

      <div className="in-project-card__body">
        <div className="in-project-card__rail">
          <span className="in-dot" />
          <span className="in-rail-label">{t('cards.kindProject')}</span>
        </div>

        <div className="in-project-card__text">
          {label ? <div className="in-project-card__meta">{label}</div> : null}

          <h3 className="in-project-card__title">{copy.title}</h3>
          {copy.body ? <p className="in-project-card__blurb">{copy.body}</p> : null}

          <span className="in-project-card__foot" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
