// Extension spelled out, unlike the rest of `src/`: two scripts import this
// file through `scripts/lib/story-promotion.mjs`, and Node's resolver does not
// guess extensions. `allowImportingTsExtensions` lets tsc read it and Vite
// resolves it unchanged. The type-only import below needs no such care —
// `verbatimModuleSyntax` erases it before Node ever sees it.
import { TAXONOMY } from './content/stories.ts';
import type { Database } from './database.types';

/**
 * What a promoted story looks like — the derivation, and nothing else.
 *
 * Three things turn a `stories` submission into a `story_entries` row, and they
 * do it for different reasons: the review desk's publishing flow writes it the
 * moment a reviewer presses publish, `scripts/promote-story.mjs` renders SQL
 * for a person to read before running, and `scripts/promote-watch.mjs` writes
 * it straight to the local database. What they must never disagree about is the
 * *shape* — the `en` and `ko` objects, which column takes the attachment, how a
 * body becomes paragraphs — so that lives here rather than in whichever of the
 * three was edited last.
 *
 * It sits under `src/` rather than beside the scripts because the desk is the
 * caller that ships: a browser cannot import out of `scripts/`, and the copy
 * that runs in production should not be the one reached by the longer path.
 * Node strips the types, so `scripts/lib/story-promotion.mjs` re-exports this
 * file and both scripts keep their import.
 *
 * No I/O, no flags, no database. Given a row and the editorial decisions, it
 * returns plain objects whose keys are the columns.
 */

export type StorySubmission = Database['public']['Tables']['stories']['Row'];
export type StoryEntryInsert = Database['public']['Tables']['story_entries']['Insert'];
export type ConstellationPointInsert =
  Database['public']['Tables']['constellation_points']['Insert'];

/** One story's copy in one language, as the `en` and `ko` columns hold it. */
export interface StoryCopy {
  eyebrow: string | null;
  title: string;
  /** The card blurb. */
  body: string;
  credit: string | null;
  /** Full text, one string per paragraph. */
  paras: string[];
}

export const FORMATS = Object.keys(TAXONOMY.format);
export const TOPICS = Object.keys(TAXONOMY.topic);

/**
 * The arc a story is placed at on the Constellation.
 *
 * The submission form's own chips, in its order — a vocabulary rather than a
 * taxonomy key, which is why it is a list here and not in `TAXONOMY`. Both
 * screens that can place a point read it from this one place; a seventh arc
 * invented on one of them would be a value the map has no cluster for.
 */
export const ARCS = ['IGNITE', 'ME ≠ WE', 'ME + WE', '(ME WE)', 'ME = WE', 'GLOW'];

/** The form offers a multi-select; the index colours by a single format. */
export function formatOf(value: string[] | string | null | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  const key = String(first).toLowerCase().trim();
  return FORMATS.includes(key) ? key : null;
}

/** A submission arrives as one text field; the reader wants paragraphs. */
export function paragraphs(body: string | null | undefined): string[] {
  return String(body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * The door the submitter came through, read as an index topic.
 *
 * The form asks "this one is something you…" and offers five doors; the index
 * files by five topics. Two of them are the same word by design — `lived` and
 * `noticed` — and the other three are not topics at all. So this maps what maps
 * and *says* when it is guessing, because a guessed topic is a filter chip a
 * reader will use and an editor should look at.
 *
 * `signature` is never guessed into: it marks the story the collection is built
 * around, and that is a decision no submission can make for itself.
 */
export const DOOR_TOPIC: Record<string, string> = {
  lived: 'lived',
  noticed: 'noticed',
  imagined: 'blog',
  'were told': 'family',
  "can't say": 'blog',
};

export function topicFor(door: string | null | undefined): { topic: string; guessed: boolean } {
  const key = String(door ?? '').toLowerCase().trim();
  const topic = DOOR_TOPIC[key];
  if (topic && (key === 'lived' || key === 'noticed')) return { topic, guessed: false };
  return { topic: topic ?? 'blog', guessed: true };
}

/**
 * A headline, from a submission that was never asked for one.
 *
 * The first sentence, cut at a word boundary. Not the whole first paragraph:
 * the index shows the title in a narrow rail beside the reading pane, where
 * anything past roughly sixty characters is a wrapped block rather than a
 * heading.
 */
export function titleFrom(paras: string[]): string | null {
  const first = paras[0];
  if (!first) return null;

  const sentence = (/^(.+?[.!?…])(\s|$)/.exec(first)?.[1] ?? first).trim();
  const trimmed = sentence.replace(/[.,;:—–-]+$/, '');
  if (trimmed.length <= 60) return trimmed;

  const cut = trimmed.slice(0, 60);
  const space = cut.lastIndexOf(' ');
  return `${(space > 20 ? cut.slice(0, space) : cut).trim()}…`;
}

/** A permalink, which is also the row's primary key. Lowercase words, hyphens. */
export function slugify(text: string | null | undefined): string | null {
  const slug = String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || null;
}

/** The editorial half — what the submission does not contain. */
export interface PublishChoices {
  slug: string;
  title: string;
  topic: string;
  format?: string | null;
  blurb?: string | null;
  eyebrow?: string | null;
  context?: string | null;
  date?: string | null;
  color?: string | null;
  koTitle?: string | null;
  koBlurb?: string | null;
  koBody?: string | null;
}

/**
 * A story with no submission behind it.
 *
 * Most of the collection is one of these: it was on the site before the form
 * existed, and it reached the database through `site/data/stories.js` and the
 * seed. The review desk can now write one directly, which is the same row by a
 * shorter road — so it is the same builder, and this is what it takes.
 */
export interface NewStory {
  /** The permalink, which is also the primary key. */
  slug: string;
  title: string;
  topic: string;
  format: string;
  /** ISO day. */
  date: string;
  eyebrow?: string | null;
  /** The sentence on the card. Falls back to the first paragraph. */
  blurb?: string | null;
  /** The full text, paragraphs separated by a blank line. */
  body?: string | null;
  credit?: string | null;
  color?: string | null;
  image?: string | null;
  koTitle?: string | null;
  koBlurb?: string | null;
  koBody?: string | null;
}

/**
 * The `story_entries` row itself, assembled in one place.
 *
 * Both roads end here — the publishing flow with a submission in hand, and the
 * desk writing a story nobody sent — so that a row cannot arrive shaped two
 * different ways. The columns a story is *born* with (`draft`, `hidden`,
 * `href`, the image knobs) are stated rather than left to the database's
 * defaults, because writing an entry is an upsert: a story that was declined
 * and is being published again is the same row, and that row is hidden.
 * Saying `false` is what brings it back.
 *
 * Without the Korean three, the English copy is carried across so the Korean
 * page renders something — the caller is expected to say that it did.
 */
export function composeEntry(story: NewStory): StoryEntryInsert {
  const paras = paragraphs(story.body);

  // Blank counts as absent, for every optional field here. A form hands back
  // an empty string where a caller in code hands back null, and the difference
  // is not one the row should carry: `image: ''` is a card with a broken
  // picture, and a blurb of no characters is a card with a hole in it where
  // the first paragraph would have done.
  const blank = (value: string | null | undefined) => (value ?? '').trim() || null;
  const body = blank(story.blurb) ?? paras[0] ?? '';

  const en: StoryCopy = {
    eyebrow: blank(story.eyebrow),
    title: story.title,
    body,
    credit: blank(story.credit),
    paras,
  };

  const ko: StoryCopy = {
    eyebrow: en.eyebrow,
    title: story.koTitle || en.title,
    body: story.koBlurb || en.body,
    credit: en.credit,
    paras: story.koBody ? paragraphs(story.koBody) : en.paras,
  };

  return {
    id: story.slug,
    published_on: story.date,
    format: story.format,
    topic: story.topic,
    color: blank(story.color),
    href: null,
    draft: false,
    hidden: false,
    image: blank(story.image),
    image_fit: null,
    image_ratio: null,
    image_position: null,
    en: en as unknown as Database['public']['Tables']['story_entries']['Insert']['en'],
    ko: ko as unknown as Database['public']['Tables']['story_entries']['Insert']['ko'],
  };
}

/**
 * The `story_entries` row, given the row and the four editorial decisions.
 *
 * What a submission answers for itself — the paragraphs, the credit, the day it
 * arrived, the attachment — is read off the row here; everything else is the
 * editorial half, and the two are handed to `composeEntry` together.
 */
export function buildEntry(row: StorySubmission, choices: PublishChoices): StoryEntryInsert {
  const paras = paragraphs(row.body);

  return composeEntry({
    slug: choices.slug,
    title: choices.title,
    topic: choices.topic,
    format: choices.format ?? formatOf(row.format) ?? 'writing',
    date: choices.date ?? String(row.created_at ?? '').slice(0, 10),
    // 'I lived it · A classroom' — the door is the half the submitter chose,
    // the context is the half an editor adds.
    eyebrow: choices.eyebrow ?? [row.door, choices.context].filter(Boolean).join(' · '),
    blurb: choices.blurb ?? paras[0] ?? '',
    body: row.body,
    credit: row.credit_name,
    color: choices.color ?? null,
    image: row.attachment_url ?? null,
    koTitle: choices.koTitle,
    koBlurb: choices.koBlurb,
    koBody: choices.koBody,
  });
}

/** Reads an entry's `en`/`ko` column back as copy, for a caller holding the row. */
export function copyOf(value: StoryEntryInsert['en']): StoryCopy {
  return value as unknown as StoryCopy;
}

/**
 * The same story as a point on the Constellation map.
 *
 * A third place, not a view of the second: a story can be published on the
 * index and deliberately left off the map, and the map carries points that were
 * never submissions. It is also the only thing that reads `arc_stage`, which
 * the form has been collecting since the beginning for exactly this.
 */
export function buildPoint(
  entry: StoryEntryInsert,
  row: StorySubmission,
  arc?: string | null,
): ConstellationPointInsert {
  // The arc is the one thing on a point that the submission can answer, and it
  // is the only reason this needs the row at all.
  return pointOf(entry, arc ?? row.arc_stage);
}

/**
 * The same point, for a story nobody submitted.
 *
 * Split out so the desk can place one for a story it wrote itself. There is no
 * arc to read off a row then, so it is asked for or left empty — the map
 * clusters by topic, and an arc it was never told is better absent than
 * guessed.
 */
export function pointOf(entry: StoryEntryInsert, arc?: string | null): ConstellationPointInsert {
  const en = copyOf(entry.en);

  return {
    id: entry.id,
    title: en.title,
    by_line: en.credit ?? 'Anonymous',
    format: entry.format,
    topic: entry.topic,
    arc: arc ?? null,
    month: String(entry.published_on).slice(0, 7),
    caption: en.body,
    read_href: `/story/all?story=${entry.id}`,
    media_href: null,
    view_href: null,
    // As above: the map's upsert has to undo a hide, or a story republished
    // after being declined would return to the index and not to the sky.
    hidden: false,
  };
}
