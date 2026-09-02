import { supabase } from '../supabase';
import type {
  CommunityCard,
  ContentTable,
  Feed,
  NewsItem,
  ProjectCard,
  PublishedStory,
  WorkshopCard,
} from '../content/types';
import type { StoryEntry } from '../content/stories';
import type { ConstellationPoint } from '../content/constellation';
import { BLANK_PORTRAIT, type Collective } from '../content/collectives';
import { reportSource } from './status';

/**
 * Reads for the site's editorial content.
 *
 * Each function returns null — not an empty array — when there is nothing to
 * report: no client configured, a failed query, or a table that exists but is
 * empty. Null means "use the bundled copy"; an empty array would mean "the
 * editors deliberately cleared this list", and those are different.
 *
 * RLS already restricts every one of these to live rows, so the filters here
 * are about intent and ordering rather than access control.
 */

/** Tables already reported as absent, so the notice appears once, not per page. */
const reportedMissing = new Set<ContentTable>();

/**
 * A table that does not exist yet is a normal state, not a failure: the
 * content tables are added by running schema.sql, and until then the site
 * renders its bundled copy. So it is separated from real errors and said once,
 * calmly.
 *
 * PostgREST reports it as PGRST205 ("Could not find the table … in the schema
 * cache") rather than passing through Postgres's own 42P01, because it answers
 * from a cached schema. Both are matched, since a direct RPC can surface the
 * Postgres code instead.
 */
const MISSING_TABLE_CODES = new Set(['PGRST205', 'PGRST202', '42P01']);

function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code && MISSING_TABLE_CODES.has(e.code)) return true;
  return Boolean(e?.message && /could not find the table|does not exist/i.test(e.message));
}

async function query<T>(
  table: ContentTable,
  run: () => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  if (!supabase) {
    reportSource(table, 'bundled');
    return null;
  }
  try {
    const { data, error } = await run();
    if (error) {
      if (isMissingTable(error)) {
        reportSource(table, 'absent');
        if (!reportedMissing.has(table) && import.meta.env.DEV) {
          reportedMissing.add(table);
          console.info(
            `[IN] "${table}" is not in the database yet — using the bundled copy. ` +
              'Run schema.sql, then seed.sql, to make it editable in Supabase.',
          );
        }
      } else {
        reportSource(table, 'error');
        console.warn('[IN → Supabase]', table, error);
      }
      return null;
    }
    if (data && data.length) {
      reportSource(table, 'live', data.length);
      return data;
    }
    reportSource(table, 'bundled');
    return null;
  } catch (error) {
    reportSource(table, 'error');
    console.warn('[IN → Supabase]', table, error);
    return null;
  }
}

/** News for one feed — the News page, the Home grid, the Community page. */
export function fetchNews(feed: Feed, limit?: number): Promise<NewsItem[] | null> {
  return query<NewsItem>('news', () => {
    let q = supabase!
      .from('news')
      .select('*')
      .eq('status', 'live')
      .contains('feeds', [feed])
      .order('published_at', { ascending: false });
    if (limit) q = q.limit(limit);
    return q;
  });
}

export function fetchWorkshops(): Promise<WorkshopCard[] | null> {
  return query<WorkshopCard>('workshops', () =>
    supabase!.from('workshops').select('*').eq('active', true).order('sort_order', { ascending: true }),
  );
}

export function fetchProjects(): Promise<ProjectCard[] | null> {
  return query<ProjectCard>('projects', () =>
    supabase!.from('projects').select('*').eq('status', 'live').order('sort_order', { ascending: true }),
  );
}

export function fetchCommunities(): Promise<CommunityCard[] | null> {
  return query<CommunityCard>('communities', () =>
    supabase!.from('communities').select('*').eq('status', 'live').order('sort_order', { ascending: true }),
  );
}

/** The columns as the table spells them, before they become a Collective. */
interface CollectiveRow {
  num: string;
  name: string;
  photo: string | null;
  one_liner: string | null;
  full_bio: string | null;
  role: string | null;
  name_ko?: string | null;
  one_liner_ko?: string | null;
  full_bio_ko?: string | null;
  role_ko?: string | null;
}

/**
 * The IN-Collective roster behind /collectives.
 *
 * Ordered by `num` rather than by a sort column: the number is the person's
 * place in the collective, so the roster is already in its own order, and a
 * separate sort field would be a second copy of the same fact.
 */
export function fetchCollectives(): Promise<Collective[] | null> {
  return query<CollectiveRow>('collectives', () =>
    supabase!
      .from('collectives')
      // `*` rather than a column list, so a database that has not run the
      // Korean-copy migration yet returns the English columns instead of
      // failing the whole query on four names it has never heard of.
      .select('*')
      .eq('status', 'live')
      .order('num', { ascending: true }),
  ).then(
    (rows) =>
      rows?.map((row) => ({
        num: row.num,
        name: row.name,
        photo: row.photo || BLANK_PORTRAIT,
        oneLiner: row.one_liner ?? '',
        fullBio: row.full_bio ?? '',
        role: row.role,
        nameKo: row.name_ko ?? null,
        oneLinerKo: row.one_liner_ko ?? null,
        fullBioKo: row.full_bio_ko ?? null,
        roleKo: row.role_ko ?? null,
      })) ?? null,
  );
}

/** The columns as the table spells them, before they are mapped to StoryEntry. */
interface StoryEntryRow {
  id: string;
  published_on: string;
  format: string;
  topic: string;
  color: string | null;
  href: string | null;
  draft: boolean;
  image: string | null;
  image_fit: string | null;
  image_ratio: string | null;
  image_position: string | null;
  en: StoryEntry['en'];
  ko: StoryEntry['ko'];
}

/** The curated story collection behind the Story index and the Constellation. */
export function fetchStoryEntries(): Promise<StoryEntry[] | null> {
  return query<StoryEntryRow>('story_entries', () =>
    supabase!
      .from('story_entries')
      .select(
        'id, published_on, format, topic, color, href, draft, image, image_fit, image_ratio, image_position, en, ko',
      )
      .order('published_on', { ascending: false }),
  ).then(
    (rows) =>
      rows?.map((row) => ({
        id: row.id,
        date: row.published_on,
        format: row.format,
        topic: row.topic,
        color: row.color,
        href: row.href,
        draft: row.draft,
        image: row.image,
        imageFit: row.image_fit,
        imageRatio: row.image_ratio,
        imagePosition: row.image_position,
        en: row.en,
        ko: row.ko,
      })) ?? null,
  );
}

/** The columns as the table spells them, before they become a point. */
interface ConstellationRow {
  id: string;
  title: string;
  by_line: string | null;
  format: string;
  topic: string;
  arc: string | null;
  month: string;
  caption: string | null;
  read_href: string | null;
  media_href: string | null;
  view_href: string | null;
  title_ko?: string | null;
  by_line_ko?: string | null;
  caption_ko?: string | null;
  topic_ko?: string | null;
}

/**
 * The lights on the Constellation map.
 *
 * This read used to sit inline in useConstellation, talking to the client
 * directly — which meant it was the one content query with no missing-table
 * handling, so a project without the table logged a raw PostgREST error on
 * every visit to the page.
 */
export function fetchConstellation(): Promise<ConstellationPoint[] | null> {
  return query<ConstellationRow>('constellation_points', () =>
    supabase!
      .from('constellation_points')
      // `*` for the same reason as the roster: the Korean columns are a later
      // migration, and a database without them should still draw the sky.
      .select('*')
      .order('month', { ascending: false }),
  ).then(
    (rows) =>
      rows?.map((row) => ({
        id: row.id,
        title: row.title,
        by: row.by_line,
        format: row.format,
        topic: row.topic,
        arc: row.arc,
        month: row.month,
        caption: row.caption,
        read: row.read_href,
        media: row.media_href,
        view: row.view_href,
        titleKo: row.title_ko ?? null,
        byKo: row.by_line_ko ?? null,
        captionKo: row.caption_ko ?? null,
        topicKo: row.topic_ko ?? null,
      })) ?? null,
  );
}

/**
 * Stories visitors submitted, once a reviewer has published them.
 *
 * Only `published` rows are readable by the anon key, so a story someone
 * submitted five minutes ago cannot appear here until it is reviewed.
 */
export function fetchPublishedStories(limit = 60): Promise<PublishedStory[] | null> {
  return query<PublishedStory>('stories', () =>
    supabase!
      .from('stories')
      .select('id, created_at, door, body, format, arc_stage, credit_name, attachment_url')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}
