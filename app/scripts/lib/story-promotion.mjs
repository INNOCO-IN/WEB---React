/**
 * What a promoted story looks like — the derivation, and nothing else.
 *
 * Two scripts turn a `stories` submission into a `story_entries` row, and they
 * do it for different reasons: `promote-story.mjs` renders SQL for a person to
 * read before running, `promote-watch.mjs` writes it straight to the local
 * database the moment a reviewer publishes. What they must never disagree about
 * is the *shape* — the `en` and `ko` objects, which column takes the attachment,
 * how a body becomes paragraphs — so that lives here, rather than in whichever
 * of the two was edited last.
 *
 * No I/O, no flags, no database. Given a row and the editorial decisions, it
 * returns plain objects whose keys are the columns.
 */

import { TAXONOMY } from '../../src/lib/content/stories.ts';

export const FORMATS = Object.keys(TAXONOMY.format);
export const TOPICS = Object.keys(TAXONOMY.topic);

/** The form offers a multi-select; the index colours by a single format. */
export function formatOf(value) {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  const key = String(first).toLowerCase().trim();
  return FORMATS.includes(key) ? key : null;
}

/** A submission arrives as one text field; the reader wants paragraphs. */
export function paragraphs(body) {
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
export const DOOR_TOPIC = {
  lived: 'lived',
  noticed: 'noticed',
  imagined: 'blog',
  'were told': 'family',
  "can't say": 'blog',
};

export function topicFor(door) {
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
export function titleFrom(paras) {
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
export function slugify(text) {
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

/**
 * The `story_entries` row, given the row and the four editorial decisions.
 *
 * `choices` takes `slug`, `title`, `topic` and `format`, and optionally
 * `blurb`, `eyebrow`, `context`, `date`, `color`, `koTitle`, `koBlurb`,
 * `koBody`. Without the Korean three, the English copy is carried across so the
 * Korean page renders something — the caller is expected to say that it did.
 */
export function buildEntry(row, choices) {
  const paras = paragraphs(row.body);
  const date = choices.date ?? String(row.created_at ?? '').slice(0, 10);

  // 'I lived it · A classroom' — the door is the half the submitter chose, the
  // context is the half an editor adds.
  const eyebrow = choices.eyebrow ?? [row.door, choices.context].filter(Boolean).join(' · ');
  const body = choices.blurb ?? paras[0];

  const en = {
    eyebrow: eyebrow || null,
    title: choices.title,
    body,
    credit: row.credit_name || null,
    paras,
  };

  const ko = {
    eyebrow: en.eyebrow,
    title: choices.koTitle ?? en.title,
    body: choices.koBlurb ?? en.body,
    credit: en.credit,
    paras: choices.koBody ? paragraphs(choices.koBody) : en.paras,
  };

  return {
    id: choices.slug,
    published_on: date,
    format: choices.format ?? formatOf(row.format),
    topic: choices.topic,
    color: choices.color ?? null,
    href: null,
    draft: false,
    image: row.attachment_url ?? null,
    image_fit: null,
    image_ratio: null,
    image_position: null,
    en,
    ko,
  };
}

/**
 * The same story as a point on the Constellation map.
 *
 * A third place, not a view of the second: a story can be published on the
 * index and deliberately left off the map, and the map carries points that were
 * never submissions. It is also the only thing that reads `arc_stage`, which
 * the form has been collecting since the beginning for exactly this.
 */
export function buildPoint(entry, row, arc) {
  return {
    id: entry.id,
    title: entry.en.title,
    by_line: entry.en.credit ?? 'Anonymous',
    format: entry.format,
    topic: entry.topic,
    arc: arc ?? row.arc_stage ?? null,
    month: String(entry.published_on).slice(0, 7),
    caption: entry.en.body,
    read_href: `/story/all?story=${entry.id}`,
    media_href: null,
    view_href: null,
  };
}
