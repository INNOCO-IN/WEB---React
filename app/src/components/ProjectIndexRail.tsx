import { Link } from 'react-router-dom';
import { useProjects } from '../lib/hooks/useContent';
import { copyIn } from '../lib/content/types';
import { useTranslation } from 'react-i18next';
import { localize, useLocale } from '../lib/lang';
import './ProjectIndexRail.css';

/**
 * The "All projects" rail shown beside every project detail page.
 *
 * The legacy component hard-coded its eight entries in the page's script, so
 * the four finished project pages missing from that list were unreachable by
 * clicking. Reading the list from the projects table fixes that class of bug
 * for good: a project is in the rail because it is in the table.
 *
 * No Korean project brief exists, so the rail is only ever drawn on an English
 * page today. It still reads its language off the route rather than assuming:
 * the day one is translated, the rail follows without being told.
 */


interface Props {
  /** Slug of the project being read, highlighted in the list. */
  current?: string;
}

export default function ProjectIndexRail({ current }: Props) {
  const { data: projects } = useProjects();
  const locale = useLocale();
  const { t } = useTranslation();

  return (
    <nav className="in-rail" aria-label={t('cards.allProjects')}>
      <div className="in-rail__heading">{t('cards.allProjects')}</div>
      <ul className="in-rail__list">
        {projects.map((project) => {
          const active = project.slug === current;
          const copy = copyIn(project, locale);
          return (
            <li key={project.slug}>
              <Link
                to={localize(project.route ?? `/project/${project.slug}`, locale)}
                className={`in-rail__item${active ? ' is-current' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="in-rail__meta">{copy.meta}</span>
                <span className="in-rail__title">{copy.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
