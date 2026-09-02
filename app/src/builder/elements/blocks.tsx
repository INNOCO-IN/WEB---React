import NewsGrid from '../../components/cards/NewsGrid';
import WorkshopWall from '../../components/cards/WorkshopWall';
import ProjectWall from '../../components/cards/ProjectWall';
import CommunityGrid from '../../components/cards/CommunityGrid';
import type { Feed } from '../../lib/content/types';
import { num, oneOf } from '../props';
import type { ElementProps } from './primitives';

/**
 * The site's own content blocks, as builder elements.
 *
 * Without these the builder could only express pages made of headings and
 * images, and every real page here ends in a wall of cards read from the
 * database. Registering them is what lets a page say "and then list the
 * workshops" — by name, from a fixed set, with no component reference
 * anywhere in the saved document.
 *
 * They take no localized fields of their own: each one already resolves its
 * own copy per locale from the row it renders, through `inLang`. A builder
 * page inherits that for free.
 */

const FEEDS = ['home', 'news', 'community', 'story', 'project'] as const;

export function NewsGridElement({ value }: ElementProps) {
  const limit = num(value.limit, 0);
  return <NewsGrid feed={oneOf<Feed>(value.feed, FEEDS, 'news')} limit={limit || undefined} />;
}

export function WorkshopWallElement() {
  return <WorkshopWall />;
}

export function ProjectWallElement() {
  return <ProjectWall />;
}

export function CommunityGridElement() {
  return <CommunityGrid />;
}
