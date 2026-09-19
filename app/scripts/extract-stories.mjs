/**
 * Turns site/data/stories.js into typed content and seed SQL.
 *
 *   node scripts/extract-stories.mjs
 *
 * That file calls itself the single source of truth for every story on the
 * site, and it is — but it reaches the page as two globals assigned by a
 * script tag, which means nothing can typecheck it and only a browser can read
 * it. Evaluated here in a sandbox, it becomes:
 *
 *   src/lib/content/stories.ts   typed records + taxonomy, bundled
 *   ../seed-stories.sql          the same rows for the story_entries table
 *
 * Both languages stay on one record, as they are in the source: a story is one
 * thing told twice, not two stories.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, '..', '..', 'site', 'data', 'stories.js');
const OUT = join(HERE, '..', 'src', 'lib', 'content', 'stories.ts');
const SEED = join(HERE, '..', '..', 'seed-stories.sql');

// The file assigns onto `window`; give it one and nothing else.
const sandbox = {};
new Function('window', readFileSync(SOURCE, 'utf8'))(sandbox);

const taxonomy = sandbox.IN_TAXONOMY;
const stories = sandbox.IN_STORIES;

if (!taxonomy || !stories) {
  throw new Error('stories.js did not assign IN_TAXONOMY / IN_STORIES — has its shape changed?');
}

/** Image paths are page-relative in the source and root-absolute in the app. */
function resolve(path) {
  if (!path) return null;
  return /^(https?:|data:|\/)/i.test(path) ? path : '/' + path.replace(/^\.\//, '');
}

const records = stories
  .map((story) => ({
    id: story.id,
    date: story.date,
    format: story.format,
    topic: story.topic,
    color: story.color ?? null,
    href: story.href && story.href !== '#' ? story.href : null,
    draft: Boolean(story.draft),
    image: resolve(story.media?.image ?? null),
    imageFit: story.media?.fit ?? null,
    imageRatio: story.media?.ratio ?? null,
    imagePosition: story.media?.pos ?? null,
    en: story.en,
    ko: story.ko,
  }))
  .sort((a, b) => b.date.localeCompare(a.date));

/* ---------------------------------------------------------- constellation */

/**
 * The Constellation's points live in that page's own script — twenty of them,
 * a superset of the story collection with a contributor, a caption and up to
 * three ways to follow it (read / watch / view).
 *
 * The array is plain object literals, so it evaluates in the same sandbox
 * trick rather than being regexed apart.
 */
const constellationSource = readFileSync(
  join(HERE, '..', '..', 'site', 'Constellation.EN.dc.html'),
  'utf8',
);

const block = /data\(\)\s*\{\s*return \[([\s\S]*?)\n    \];/.exec(constellationSource);
const points = block
  ? new Function(`return [${block[1]}\n]`)().map((p) => ({
      id: p.id,
      title: p.title,
      by: p.by ?? null,
      format: p.format,
      topic: p.topic,
      arc: p.arc ?? null,
      /** yyyy-mm — the points are placed by month, not by day. */
      month: p.date,
      caption: p.caption ?? null,
      read: p.read ? toRoute(p.read) : null,
      media: p.media ?? null,
      view: p.view ? (/^https?:/.test(p.view) ? p.view : '/' + p.view.replace(/^\//, '')) : null,
    }))
  : [];

/** `Story-Index.EN.dc.html?story=x` → `/story/all?story=x`. */
function toRoute(href) {
  if (/^https?:/i.test(href)) return href;
  const [file, search] = href.split('?');
  if (file === 'Story-Index.EN.dc.html') return `/story/all${search ? '?' + search : ''}`;
  if (file === 'Story-Index.KO.dc.html') return `/ko/story/all${search ? '?' + search : ''}`;
  return href;
}

/* ---------------------------------------------- the same sky, in Korean */

/**
 * The Korean page carries its own copy of the array, fully translated — and
 * nothing was reading it, so every point in the table had `title_ko` null and
 * the Korean Constellation showed English.
 *
 * Joined by `id` rather than by position, because the two arrays are hand-kept
 * and a point added to one and not the other should go missing rather than
 * quietly take its neighbour's words.
 */
const koSource = readFileSync(
  join(HERE, '..', '..', 'site', 'Constellation.KO.dc.html'),
  'utf8',
);

const koBlock = /data\(\)\s*\{\s*return \[([\s\S]*?)\n    \];/.exec(koSource);
const korean = new Map(
  (koBlock ? new Function(`return [${koBlock[1]}\n]`)() : []).map((p) => [p.id, p]),
);

for (const point of points) {
  const ko = korean.get(point.id);
  if (!ko) continue;
  point.titleKo = ko.title ?? null;
  point.byKo = ko.by ?? null;
  point.captionKo = ko.caption ?? null;
  point.topicKo = ko.topic ?? null;
}

/* ------------------------------------------------ one collection, not two */

/**
 * The index and the map, reconciled.
 *
 * These two lists were extracted from two different files and never compared,
 * which is exactly how they ended up describing different collections: eleven
 * of the twelve stories had no light on the map, nineteen lights had no story
 * behind them, and two of those nineteen carried a READ button pointing at a
 * story that did not exist. Three pages, three answers to "what has IN
 * published".
 *
 * They are not the same table and should not be — a story can be published and
 * deliberately left off the map, and the map can carry a photograph that is not
 * a story. But *by default* a thing IN published is both, and a default is
 * something a script can hold. Anything an editor decides otherwise is a change
 * in the database, which neither of these seeds overwrites: both are
 * `on conflict do update` on the columns they own, and neither deletes.
 *
 * Both vocabularies are kept. `story_entries.topic` is one of the five
 * taxonomy keys the submission form's doors map into; `constellation_points.topic`
 * is the label the sky clusters by, which is richer and has a Korean twin. So
 * this translates between them rather than flattening one into the other.
 */

/** A point's cluster label → the index's taxonomy key. */
const TOPIC_KEY = {
  Classroom: 'signature',
  Family: 'family',
  'Noticed in the world': 'noticed',
  Nature: 'noticed',
  Neighbors: 'lived',
  Collective: 'lived',
};

/** The door a topic came in through — the inverse of `DOOR_TOPIC`, where it exists. */
const DOOR = {
  lived: 'lived',
  noticed: 'noticed',
  family: 'were told',
};

const byId = new Map(records.map((r) => [r.id, r]));
const pointById = new Map(points.map((p) => [p.id, p]));

/** What the two derivations invented, said out loud at the end. */
const derived = { entries: [], points: [], guessedTopics: [] };

// A light with no story behind it becomes one. The design wrote a title, a
// contributor and a sentence for each; that sentence is the whole story there
// is, so it is both the blurb and the body rather than being padded out.
for (const point of points) {
  if (byId.has(point.id)) continue;

  const topic = TOPIC_KEY[point.topic] ?? 'noticed';
  if (!TOPIC_KEY[point.topic]) derived.guessedTopics.push(`${point.id} (${point.topic})`);

  const copy = (title, by, caption, label) => ({
    eyebrow: label ?? '',
    title: title ?? '',
    body: caption ?? '',
    credit: by ?? '',
    paras: caption ? [caption] : [],
  });

  const record = {
    id: point.id,
    // The sky places by month; a date column will not. The first of the month
    // is the honest reading of "sometime in this one", and it keeps the index's
    // month grouping landing where the sky put it.
    date: `${point.month}-01`,
    format: point.format,
    topic,
    color: null,
    href: null,
    draft: false,
    image: null,
    imageFit: null,
    imageRatio: null,
    imagePosition: null,
    en: copy(point.title, point.by, point.caption, point.topic),
    ko: copy(
      point.titleKo ?? point.title,
      point.byKo ?? point.by,
      point.captionKo ?? point.caption,
      point.topicKo ?? point.topic,
    ),
  };

  records.push(record);
  byId.set(record.id, record);
  derived.entries.push(record.id);

  // The READ button now has something to open.
  if (!point.read) point.read = `/story/all?story=${point.id}`;
}

// And a story with no light gets one.
for (const record of records) {
  if (pointById.has(record.id)) continue;

  const point = {
    id: record.id,
    title: record.en.title,
    by: record.en.credit || 'Anonymous',
    format: record.format,
    topic: taxonomy.topic[record.topic]?.en ?? record.topic,
    arc: null,
    month: record.date.slice(0, 7),
    caption: record.en.body,
    titleKo: record.ko.title || null,
    byKo: record.ko.credit || null,
    captionKo: record.ko.body || null,
    topicKo: taxonomy.topic[record.topic]?.ko ?? null,
    read: `/story/all?story=${record.id}`,
    media: null,
    view: null,
  };

  points.push(point);
  pointById.set(point.id, point);
  derived.points.push(point.id);
}

records.sort((a, b) => b.date.localeCompare(a.date));
points.sort((a, b) => b.month.localeCompare(a.month));

writeFileSync(
  OUT,
  `// Generated by scripts/extract-stories.mjs from site/data/stories.js.
// Do not edit by hand — edit the source, or the story_entries table.

/** One story's copy in one language. */
export interface StoryCopy {
  eyebrow: string;
  title: string;
  /** The card blurb. */
  body: string;
  credit: string;
  /** Full text, one string per paragraph. Both languages carry the same count. */
  paras: string[];
  kicker?: string[];
}

export interface StoryEntry {
  /** Stable slug — this is the permalink, so it never changes. */
  id: string;
  /** ISO date; drives ordering and the month grouping on the index. */
  date: string;
  /** Key into TAXONOMY.format. */
  format: string;
  /** Key into TAXONOMY.topic. */
  topic: string;
  /** Plate colour behind the card when there is no photo. */
  color: string | null;
  /** Destination page, or null when the story reads inline on the index. */
  href: string | null;
  /** Still being written. */
  draft: boolean;
  image: string | null;
  imageFit: string | null;
  imageRatio: string | null;
  imagePosition: string | null;
  /**
   * Where this entry sits on the wall of cards at the foot of /story, or
   * absent to let the date decide.
   *
   * Optional because only the database can have one: it is a curation the
   * review desk writes, and \`site/data/stories.js\` has no opinion about it, so
   * every row in this file lacks it and every row read from \`story_entries\`
   * may carry one.
   */
  wallOrder?: number | null;
  en: StoryCopy;
  ko: StoryCopy;
}

/** Format and topic keys → their label in each language. */
export const TAXONOMY: {
  format: Record<string, { en: string; ko: string }>;
  topic: Record<string, { en: string; ko: string }>;
} = ${JSON.stringify(taxonomy, null, 2)};

export const STORY_ENTRIES: StoryEntry[] = ${JSON.stringify(records, null, 2)};
`,
);

/* ------------------------------------------------------------------- seed */

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const json = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

writeFileSync(
  SEED,
  `-- IN Website — story entries seed
-- Generated by app/scripts/extract-stories.mjs from site/data/stories.js.
-- Run the story_entries section of schema.sql first.
--
-- Safe to re-run, and safe to re-run over a collection the review desk has
-- edited: a row it has written carries \`edited_at\`, and the clause at the end
-- of the first insert holds that row's columns back. An entry nobody has opened
-- still follows this file.

insert into public.story_entries
  (id, published_on, format, topic, color, href, draft, image, image_fit, image_ratio, image_position, en, ko)
values
${records
  .map(
    (s) =>
      `  (${q(s.id)}, ${q(s.date)}, ${q(s.format)}, ${q(s.topic)}, ${q(s.color)}, ${q(s.href)}, ${s.draft}, ` +
      `${q(s.image)}, ${q(s.imageFit)}, ${q(s.imageRatio)}, ${q(s.imagePosition)}, ${json(s.en)}, ${json(s.ko)})`,
  )
  .join(',\n')}
-- Every column below belongs to \`site/data/stories.js\` until the review desk
-- takes the row over. A row the desk has written carries \`edited_at\`, and for
-- that row the database keeps what is there; for every other row — which is all
-- of them until somebody opens one — this is the plain overwrite it has always
-- been. Authority moves one row at a time, at the moment somebody edits it,
-- rather than all at once. See 20260919160000_the_wall_on_story.sql.
--
-- \`hidden\` and \`wall_order\` are not in the column list above and so are never
-- touched by a re-seed, edited row or not: a story taken off the site stays
-- off, and a card pinned to the wall stays where it was put.
on conflict (id) do update set
  published_on   = case when story_entries.edited_at is null then excluded.published_on   else story_entries.published_on   end,
  format         = case when story_entries.edited_at is null then excluded.format         else story_entries.format         end,
  topic          = case when story_entries.edited_at is null then excluded.topic          else story_entries.topic          end,
  color          = case when story_entries.edited_at is null then excluded.color          else story_entries.color          end,
  href           = case when story_entries.edited_at is null then excluded.href           else story_entries.href           end,
  draft          = case when story_entries.edited_at is null then excluded.draft          else story_entries.draft          end,
  image          = case when story_entries.edited_at is null then excluded.image          else story_entries.image          end,
  image_fit      = case when story_entries.edited_at is null then excluded.image_fit      else story_entries.image_fit      end,
  image_ratio    = case when story_entries.edited_at is null then excluded.image_ratio    else story_entries.image_ratio    end,
  image_position = case when story_entries.edited_at is null then excluded.image_position else story_entries.image_position end,
  en             = case when story_entries.edited_at is null then excluded.en             else story_entries.en             end,
  ko             = case when story_entries.edited_at is null then excluded.ko             else story_entries.ko             end;

-- ---------- and the submission each one would have arrived as ----------
--
-- The stories table is the intake table: what somebody sent through the form.
-- None of these came that way. They were on the site before the form existed,
-- or they are the sample lights the Constellation was designed around -- and
-- the review desk, which reads only this table, could therefore answer "what
-- has IN published?" with three rows while three other pages answered with
-- thirty.
--
-- So each published story gets the row it would have had. What the rows do not
-- do is pretend to be correspondence: email is null on every one, so nobody
-- writes back to an address that was never given, and source_page says where
-- the story actually came from rather than naming a form nobody filled in.
-- consent is true because these are IN's own published stories carrying IN's
-- own by-lines -- the column records that publication was agreed, and for
-- these it was, years ago, off-site.
--
-- The id is derived from the permalink rather than generated, so re-running
-- this seed corrects the rows it wrote last time instead of adding a second
-- set. A real submission keeps its own uuid and is never touched by this.

insert into public.stories
  (id, created_at, door, body, format, arc_stage, credit_name, email, consent, source_page, status, published_as)
values
${records
  .map((s) => {
    const point = pointById.get(s.id);
    return (
      `  (md5(${q(s.id)})::uuid, ${q(s.date)}, ${q(DOOR[s.topic] ?? null)}, ${q(s.en.paras.join('\n\n'))}, ` +
      `${q('{' + s.format + '}')}, ${q(point?.arc ?? null)}, ${q(s.en.credit || null)}, null, true, ` +
      `'/story', 'published', ${q(s.id)})`
    );
  })
  .join(',\n')}
on conflict (id) do update set
  created_at = excluded.created_at, door = excluded.door, body = excluded.body,
  format = excluded.format, arc_stage = excluded.arc_stage,
  credit_name = excluded.credit_name, consent = excluded.consent,
  source_page = excluded.source_page, status = excluded.status,
  published_as = excluded.published_as;
`,
);

writeFileSync(
  join(HERE, '..', 'src', 'lib', 'content', 'constellation.ts'),
  `// Generated by scripts/extract-stories.mjs from site/Constellation.EN.dc.html.
// Do not edit by hand — edit the constellation_points table.

/** One light in the Constellation. */
export interface ConstellationPoint {
  id: string;
  title: string;
  /** Who it came from — often 'Anonymous', which is the point. */
  by: string | null;
  /** Key into the colour scale, and one of the two grouping modes. */
  format: string;
  topic: string;
  /** Where it sits on the MEWE loop, when it has been placed. */
  arc: string | null;
  /** yyyy-mm — points are placed by month, not by day. */
  month: string;
  caption: string | null;
  /**
   * Korean copy, absent until someone writes it — see \`inLang\`. The bundled
   * rows never carry it: they are extracted from the English page, and the
   * translation belongs in the table.
   *
   * \`topicKo\` is a label only. \`topic\` stays the grouping key, so the sky
   * clusters the same way in both languages.
   */
  titleKo?: string | null;
  byKo?: string | null;
  captionKo?: string | null;
  topicKo?: string | null;
  titleZhTw?: string | null;
  byZhTw?: string | null;
  captionZhTw?: string | null;
  topicZhTw?: string | null;
  /** Up to three ways to follow it. */
  read: string | null;
  media: string | null;
  view: string | null;
}

/** The colour each format glows. */
export const FORMAT_COLORS: Record<string, string> = {
  writing: '#F0D23C',
  drawing: '#E6328C',
  photo: '#35C0B4',
  video: '#FF5A5A',
  music: '#9B7BE0',
  dance: '#F5A81E',
  craft: '#6FCB7C',
  recipe: '#C9962B',
  symbol: '#7BC4F0',
  other: '#FAF4E2',
};

export const CONSTELLATION: ConstellationPoint[] = ${JSON.stringify(points, null, 2)};
`,
);

writeFileSync(
  join(HERE, '..', '..', 'seed-constellation.sql'),
  `-- IN Website — constellation points seed
-- Generated by app/scripts/extract-stories.mjs from site/Constellation.EN.dc.html.

insert into public.constellation_points
  (id, title, by_line, format, topic, arc, month, caption, read_href, media_href, view_href,
   title_ko, by_line_ko, caption_ko, topic_ko)
values
${points
  .map(
    (p) =>
      `  (${q(p.id)}, ${q(p.title)}, ${q(p.by)}, ${q(p.format)}, ${q(p.topic)}, ${q(p.arc)}, ` +
      `${q(p.month)}, ${q(p.caption)}, ${q(p.read)}, ${q(p.media)}, ${q(p.view)}, ` +
      `${q(p.titleKo)}, ${q(p.byKo)}, ${q(p.captionKo)}, ${q(p.topicKo)})`,
  )
  .join(',\n')}
on conflict (id) do update set
  title = excluded.title, by_line = excluded.by_line, format = excluded.format,
  topic = excluded.topic, arc = excluded.arc, month = excluded.month,
  caption = excluded.caption, read_href = excluded.read_href,
  media_href = excluded.media_href, view_href = excluded.view_href,
  title_ko = excluded.title_ko, by_line_ko = excluded.by_line_ko,
  caption_ko = excluded.caption_ko, topic_ko = excluded.topic_ko;
`,
);

console.log(`points:   ${points.length}`);
console.log(`stories:  ${records.length}`);
if (derived.entries.length) {
  console.log(`derived:  ${derived.entries.length} entries from lights that had none`);
}
if (derived.points.length) {
  console.log(`          ${derived.points.length} lights from stories that had none`);
}
if (derived.guessedTopics.length) {
  console.log(`!! topic guessed for ${derived.guessedTopics.length}: ${derived.guessedTopics.join(', ')}`);
  console.log('   Name the label in TOPIC_KEY here, or fix the row in Studio.');
}
console.log(`formats:  ${Object.keys(taxonomy.format).length}`);
console.log(`topics:   ${Object.keys(taxonomy.topic).length}`);
