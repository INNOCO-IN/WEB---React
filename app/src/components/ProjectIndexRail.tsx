import { Link } from 'react-router-dom';
import { useProjects } from '../lib/hooks/useContent';
import './ProjectIndexRail.css';

/**
 * The "All projects" rail shown beside every project detail page.
 *
 * The legacy component hard-coded its eight entries in the page's script, so
 * the four finished project pages missing from that list were unreachable by
 * clicking. Reading the list from the projects table fixes that class of bug
 * for good: a project is in the rail because it is in the table.
 */

interface Props {
  /** Slug of the project being read, highlighted in the list. */
  current?: string;
}

export default function ProjectIndexRail({ current }: Props) {
  const { data: projects } = useProjects();

  return (
    <nav className="in-rail" aria-label="All projects">
      <div className="in-rail__heading">All projects</div>
      <div className="in-rail__list">
        {projects.map((project) => {
          const active = project.slug === current;
          return (
            <Link
              key={project.slug}
              to={project.route ?? `/project/${project.slug}`}
              className={`in-rail__item${active ? ' is-current' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="in-rail__meta">{project.meta}</span>
              <span className="in-rail__title">{project.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
