import { Link } from 'react-router-dom';
import { useProjects } from '../../lib/hooks/useContent';
import { copyIn } from '../../lib/content/types';
import type { ProjectCard as Project } from '../../lib/content/types';
import type { Lang } from '../nav-data';
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
  lang?: Lang;
}

/** The vertical rail label, and what the arrow says to a screen reader. */
const KIND: Record<Lang, string> = { EN: 'Project', KO: '프로젝트' };
const OPEN: Record<Lang, string> = { EN: 'Open', KO: '열기' };

export default function ProjectWall({ lang = 'EN' }: Props) {
  const { data: projects } = useProjects();
  const cards = projects.filter((project) => !project.featured);

  if (!cards.length) return <div className="in-wall" />;

  return (
    <div className="in-wall">
      {cards.map((project) => (
        <ProjectBrief key={project.slug} project={project} lang={lang} />
      ))}
    </div>
  );
}

export function ProjectBrief({ project, lang = 'EN' }: { project: Project; lang?: Lang }) {
  const copy = copyIn(project, lang);
  // The card's small line is the eyebrow — 'Zayed University, UAE · Since
  // 2016'. The rail's shorter label stands in for a row that has no eyebrow.
  const label = copy.eyebrow ?? copy.meta;

  return (
    <Link
      to={project.route ?? `/project/${project.slug}`}
      className="in-project-card in-card in-plain"
      aria-label={`${OPEN[lang]} — ${copy.title}`}
    >
      <div className="in-project-card__bar" />

      <div className="in-project-card__body">
        <div className="in-project-card__rail">
          <span className="in-dot" />
          <span className="in-rail-label">{KIND[lang]}</span>
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
