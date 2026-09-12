/**
 * Turns a reviewed story submission into a story_entries row.
 *
 *   node scripts/promote-story.mjs <row.json> --slug=… --title=… --topic=…
 *
 * The two story tables are not the same thing, and deliberately so: `stories`
 * is what a visitor sent, `story_entries` is what the index publishes. A
 * submission cannot simply become an entry — the form asks for a body and a
 * format, and the index needs a permalink, a title, a topic and an eyebrow
 * that nobody has written yet. That gap is why a person promotes a story
 * rather than a trigger.
 *
 * So this does the mechanical half and refuses to guess the rest. Give it the
 * row as JSON (copy it out of the Supabase Table Editor) plus the editorial
 * decisions, and it prints an upsert. Leave one out and it prints what is
 * missing and exits 1 — it will not emit SQL with a placeholder in it, because
 * a placeholder is exactly the kind of thing that ships.
 *
 * Nothing here touches the database. The SQL goes to stdout for you to read
 * before you run it.
 */

import { readFileSync } from 'node:fs';
import {
  FORMATS,
  TOPICS,
  buildEntry,
  buildPoint,
  formatOf,
  paragraphs,
} from './lib/story-promotion.mjs';

/* ------------------------------------------------------------------ input */

const [, , file, ...rest] = process.argv;

const flags = Object.fromEntries(
  rest
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const cut = arg.indexOf('=');
      return cut === -1 ? [arg.slice(2), true] : [arg.slice(2, cut), arg.slice(cut + 1)];
    }),
);

if (!file || flags.help) {
  console.log(
    [
      'Usage: node scripts/promote-story.mjs <row.json> --slug=… --title=… --topic=…',
      '',
      '  <row.json>   a `stories` row, as copied from the Table Editor',
      '  --slug       the permalink, and the entry id: this-is-us',
      '  --title      the headline the index shows',
      `  --topic      one of: ${TOPICS.join(', ')}`,
      '',
      'Optional:',
      '  --blurb      the card summary (default: the first paragraph)',
      '  --eyebrow    overrides the line built from the door',
      '  --context    appended to the door, giving "I lived it · A classroom"',
      '  --date       published_on (default: the date on the row)',
      '  --color      plate colour for a story with no image',
      '  --format     overrides the format read off the row',
      '  --ko-title, --ko-blurb, --ko-body',
      '               the Korean side. Without them the English copy is carried',
      '               over so the page renders, and you are told that it was.',
      '  --constellation',
      '               also emit a constellation_points row for the story map',
      '  --arc        overrides the arc read off the row',
    ].join('\n'),
  );
  process.exit(file ? 0 : 1);
}

let row;
try {
  row = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`Could not read ${file} as JSON — ${error.message}`);
  process.exit(1);
}

/* ------------------------------------------------------- what the row gives */

const paras = paragraphs(row.body);
const format = flags.format ?? formatOf(row.format);
const date = flags.date ?? String(row.created_at ?? '').slice(0, 10);

/* ------------------------------------------ what the row cannot give: check */

const missing = [];
if (!flags.slug) missing.push('--slug     the permalink, e.g. --slug=two-hands-one-line');
if (!flags.title) missing.push('--title    the headline the index shows');
if (!flags.topic) missing.push(`--topic    one of: ${TOPICS.join(', ')}`);
if (!format) missing.push(`--format   the row says ${JSON.stringify(row.format ?? null)}; one of: ${FORMATS.join(', ')}`);
if (!date) missing.push('--date     the row carries no date to read');
if (!paras.length) missing.push('(the row has an empty body — there is nothing to publish)');

if (flags.topic && !TOPICS.includes(flags.topic)) {
  missing.push(`--topic    "${flags.topic}" is not a topic; one of: ${TOPICS.join(', ')}`);
}
if (format && !FORMATS.includes(format)) {
  missing.push(`--format   "${format}" is not a format; one of: ${FORMATS.join(', ')}`);
}
if (flags.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(flags.slug)) {
  missing.push(`--slug     "${flags.slug}" is not a slug — lowercase words joined by hyphens`);
}

if (missing.length) {
  console.error('This submission cannot be promoted yet.\n');
  console.error('The row supplies:');
  console.error(`  door        ${row.door ?? '—'}`);
  console.error(`  format      ${JSON.stringify(row.format ?? null)}`);
  console.error(`  arc_stage   ${row.arc_stage ?? '—'}`);
  console.error(`  credit_name ${row.credit_name || '— (anonymous)'}`);
  console.error(`  attachment  ${row.attachment_url ?? '—'}`);
  console.error(`  body        ${paras.length} paragraph(s)\n`);
  console.error('Still needed:');
  for (const line of missing) console.error(`  ${line}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ build */

const translated = Boolean(flags['ko-title'] || flags['ko-blurb'] || flags['ko-body']);

// The shape is scripts/lib/story-promotion.mjs's, so that what this prints and
// what promote-watch.mjs writes are the same row.
const entry = buildEntry(row, {
  slug: flags.slug,
  title: flags.title,
  topic: flags.topic,
  format,
  date,
  blurb: flags.blurb,
  eyebrow: flags.eyebrow,
  context: flags.context,
  color: flags.color,
  koTitle: flags['ko-title'],
  koBlurb: flags['ko-blurb'],
  koBody: flags['ko-body'],
});

/* -------------------------------------------------------------------- SQL */

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const json = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const ENTRY_COLUMNS = [
  'id', 'published_on', 'format', 'topic', 'color', 'href', 'draft',
  'image', 'image_fit', 'image_ratio', 'image_position', 'en', 'ko',
];

const literal = (column, value) => {
  if (column === 'draft') return value ? 'true' : 'false';
  if (column === 'en' || column === 'ko') return json(value);
  return q(value);
};

const values = ENTRY_COLUMNS.map((column) => literal(column, entry[column])).join(', ');

console.log(`-- Promoted from stories.${row.id ?? '(no id)'} by scripts/promote-story.mjs
-- Read it before you run it, then set status = 'published' on the submission
-- so the intake table records that this one was carried across.
insert into public.story_entries
  (${ENTRY_COLUMNS.join(', ')})
values
  (${values})
on conflict (id) do update set
  published_on = excluded.published_on, format = excluded.format, topic = excluded.topic,
  color = excluded.color, image = excluded.image, en = excluded.en, ko = excluded.ko;`);

/**
 * The map is a third place, not a view of the second.
 *
 * `constellation_points` is its own table with its own editorial act — a story
 * can be published on the index and deliberately not placed on the map, and the
 * map carries points that were never story submissions at all. So this is off
 * unless asked for, rather than something every promotion drags along.
 *
 * It is also the only thing that reads `arc_stage`. The submission form has
 * been collecting it since the beginning and nothing has ever used it: the
 * index has no arc, and the map's `arc` column is exactly what it was for.
 */
if (flags.constellation) {
  const point = buildPoint(entry, row, flags.arc);
  const POINT_COLUMNS = [
    'id', 'title', 'by_line', 'format', 'topic', 'arc',
    'month', 'caption', 'read_href', 'media_href', 'view_href',
  ];

  console.log(`
-- The same story as a point on the map. Placed by month, coloured by format.
insert into public.constellation_points
  (${POINT_COLUMNS.join(', ')})
values
  (${POINT_COLUMNS.map((column) => q(point[column])).join(', ')})
on conflict (id) do update set
  title = excluded.title, by_line = excluded.by_line, format = excluded.format,
  topic = excluded.topic, arc = excluded.arc, month = excluded.month,
  caption = excluded.caption, read_href = excluded.read_href;`);

  if (!point.arc) {
    console.error(
      '\nNote: the row carries no arc_stage, so the point is unplaced on the loop.\n' +
        'Pass --arc to place it, or set it later in the Table Editor.',
    );
  }
}

if (!translated) {
  console.error(
    '\nNote: no Korean supplied, so the English copy was carried into the `ko` column.\n' +
      '/ko/story/all will show English for this story until someone translates it.',
  );
}
