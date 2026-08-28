import { useEffect, useState } from 'react';
import {
  fetchCollectives,
  fetchCommunities,
  fetchNews,
  fetchProjects,
  fetchPublishedStories,
  fetchWorkshops,
} from '../services/content';
import { watchTable } from '../services/realtime';
import { news as newsFallback } from '../content/news';
import { workshops as workshopsFallback } from '../content/workshops';
import { projects as projectsFallback } from '../content/projects';
import { communities as communitiesFallback } from '../content/communities';
import { ROSTER, type Collective } from '../content/collectives';
import type {
  CommunityCard,
  ContentTable,
  Feed,
  NewsItem,
  ProjectCard,
  PublishedStory,
  WorkshopCard,
} from '../content/types';

/**
 * Content hooks.
 *
 * Every one of these starts from the bundled copy and replaces it if the
 * database answers with something. That ordering is the point: the card grid
 * renders on the first paint with real content, then quietly updates — no
 * spinner, no layout shift from an empty state, and nothing blank if the
 * request fails.
 *
 * Each one also names its table, and a hook that names its table stays
 * subscribed to it for as long as the page is mounted: an edit in the Supabase
 * Table Editor reaches an open tab without a reload. The subscription is shared
 * per table and torn down when the last reader unmounts — see services/realtime.
 *
 * `live` tells a caller which copy it is looking at. Only the admin-facing
 * bits need it; the public pages should not care.
 */

export interface ContentState<T> {
  data: T[];
  /** True once the database has answered with rows. */
  live: boolean;
  loading: boolean;
}

/**
 * Fills a row's empty fields from the bundled row with the same key.
 *
 * This matters during a migration. The `workshops` table already existed with
 * only (slug, title, active, sort_order) — enough to populate a form's
 * dropdown, which is what it was built for. Reading it straight would render
 * ten cards with no blurb, no colour and no audience filter. Merging means a
 * table gains its columns one at a time without the site going blank in
 * between, and the database still wins wherever it has an actual value.
 */
function mergeWithFallback<T extends Record<string, unknown>>(
  rows: T[],
  fallback: T[],
  key: keyof T,
): T[] {
  const bundled = new Map(fallback.map((row) => [row[key], row]));

  return rows.map((row) => {
    const base = bundled.get(row[key]);
    if (!base) return row;

    const merged = { ...base };
    for (const [field, value] of Object.entries(row)) {
      if (value !== null && value !== undefined && value !== '') {
        (merged as Record<string, unknown>)[field] = value;
      }
    }
    return merged;
  });
}

function useContent<T>(
  fallback: T[],
  load: () => Promise<T[] | null>,
  deps: unknown[] = [],
  mergeKey?: keyof T,
  table?: ContentTable,
): ContentState<T> {
  const [state, setState] = useState<ContentState<T>>({ data: fallback, live: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    function apply(rows: T[] | null) {
      if (cancelled) return;
      if (!rows) {
        setState({ data: fallback, live: false, loading: false });
        return;
      }
      const data = mergeKey
        ? mergeWithFallback(
            rows as unknown as Record<string, unknown>[],
            fallback as unknown as Record<string, unknown>[],
            mergeKey as string,
          ) as unknown as T[]
        : rows;
      setState({ data, live: true, loading: false });
    }

    const read = () => load().then(apply);
    read();

    // A row change re-runs the same read rather than patching the array. The
    // query carries filters and an order that a payload alone cannot honour.
    const stopWatching = table ? watchTable(table, read) : undefined;

    return () => {
      cancelled = true;
      stopWatching?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export function useNews(feed: Feed = 'news', limit?: number): ContentState<NewsItem> {
  const fallback = newsFallback
    .filter((item) => item.status === 'live' && (item.feeds as string[]).includes(feed))
    .slice(0, limit ?? undefined);

  return useContent(fallback, () => fetchNews(feed, limit), [feed, limit], 'id', 'news');
}

export function useWorkshops(): ContentState<WorkshopCard> {
  return useContent(
    workshopsFallback.filter((w) => w.active).sort((a, b) => a.sort_order - b.sort_order),
    fetchWorkshops,
    [],
    'slug',
    'workshops',
  );
}

export function useProjects(): ContentState<ProjectCard> {
  return useContent(
    projectsFallback.filter((p) => p.status === 'live').sort((a, b) => a.sort_order - b.sort_order),
    fetchProjects,
    [],
    'slug',
    'projects',
  );
}

export function useCommunities(): ContentState<CommunityCard> {
  return useContent(
    communitiesFallback.filter((c) => c.status === 'live').sort((a, b) => a.sort_order - b.sort_order),
    fetchCommunities,
    [],
    'slug',
    'communities',
  );
}

/**
 * The IN-Collective roster.
 *
 * Merged on `num`, so a row that carries only a new one-liner keeps the
 * bundled bio and portrait rather than blanking them — the same migration
 * path the workshops table needed.
 */
export function useCollectives(): ContentState<Collective> {
  return useContent(ROSTER, fetchCollectives, [], 'num', 'collectives');
}

/**
 * Published stories.
 *
 * No bundled fallback: unlike the editorial tables, a story only exists once
 * someone submits one and a reviewer publishes it. An empty list here is the
 * truth, so the pages that use it show their own empty state.
 */
export function useStories(limit?: number): ContentState<PublishedStory> {
  return useContent<PublishedStory>([], () => fetchPublishedStories(limit), [limit], undefined, 'stories');
}
