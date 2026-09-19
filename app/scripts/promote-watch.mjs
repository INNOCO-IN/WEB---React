/**
 * Publishes a story the moment a reviewer approves it — locally, and only locally.
 *
 *   npm --prefix app run promote-watch
 *
 * The two story tables are separate on purpose: `stories` is what a visitor
 * sent, `story_entries` is what the index publishes, and the gap between them
 * is editorial — a permalink, a headline and a topic the form never asked for.
 * `promote-story.mjs` refuses to guess any of it, which is right for the live
 * site and is three commands too many for working on your own machine.
 *
 * So this guesses, out loud, and leaves the guesses easy to fix. It watches the
 * intake table, and the moment a row's status becomes `published` — from the
 * review desk, from Studio, from anywhere — it derives an entry and writes it.
 * `story_entries` is a table an open page is subscribed to, so the story
 * appears on `/story/all` about a second later without a reload. Submit,
 * approve, done.
 *
 * **It refuses to run against anything but a local stack.** The check is the
 * URL, not a flag: a guessed headline is a fine thing to put on a development
 * database and not a thing to put on the site. Publishing to the hosted project
 * stays `promote-story.mjs`, where a person types the title.
 *
 * What it derives, and how to correct it:
 *
 *   title    the first sentence of the body, cut at a word boundary
 *   slug     that title, hyphenated — it is the permalink, so it is worth a look
 *   topic    the door the submitter chose, where that is a topic; `blog` and a
 *            warning where it is not
 *   format   the first format chip, or `writing` when the form collected none
 *   the rest  eyebrow from the door, credit, date, and the attachment as the image
 *
 * All of it is editable in Studio afterwards, and an edit there is not
 * overwritten: a submission whose entry already exists is left alone unless you
 * pass `--force`.
 *
 * Flags:
 *   --once              sweep what is already published, then exit
 *   --force             rewrite entries that are already there
 *   --no-constellation  index only, no point on the map
 *
 * The key it needs is the service-role key, from `app/.env.devdb` — the local
 * stack's, committed because it only addresses 127.0.0.1. Nothing under `src/`
 * reads it and it never reaches the browser.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { readEnvFiles, isLocalUrl } from './lib/env-files.mjs';
import {
  FORMATS,
  buildEntry,
  buildPoint,
  formatOf,
  paragraphs,
  slugify,
  titleFrom,
  topicFor,
} from './lib/story-promotion.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');

const flags = process.argv.slice(2);
const once = flags.includes('--once');
const force = flags.includes('--force');
const mapToo = !flags.includes('--no-constellation');

/* ------------------------------------------------------------------- env */

/** The same read `dev-signin-link.mjs` does: Vite's files, in Vite's order. */
const { values: vars } = readEnvFiles(APP, ['.env.local', '.env.devdb']);
const { VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = vars;

if (!url || !key) {
  console.error(
    'No local stack in app/.env.devdb.\n' +
      'Start it and regenerate the file:\n' +
      '  npx supabase start --workdir app\n' +
      '  npm --prefix app run db:env',
  );
  process.exit(1);
}

if (!isLocalUrl(url)) {
  console.error(
    `Refusing to run: ${url} is not a local stack.\n\n` +
      'This script invents a headline, a permalink and sometimes a topic. That is\n' +
      'fine on your own machine and not fine on the site. To publish there, use\n' +
      'promote-story.mjs, which asks a person for all three.\n\n' +
      'If you expected the local one: app/.env.devdb is what points here, and\n' +
      'nothing in it was read — so app/.env.local answered instead. Start the\n' +
      'stack and regenerate it:\n' +
      '  npx supabase start --workdir app\n' +
      '  npm --prefix app run db:env',
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/* --------------------------------------------------------------- promote */

const say = (...parts) => console.log('[promote-watch]', ...parts);

/**
 * One submission, as an index entry.
 *
 * Returns what it did so the caller can report it, and does nothing at all when
 * the entry is already there: an editor who fixed a guessed title in Studio
 * should not have it guessed over again the next time anything touches the row.
 */
async function promote(row) {
  const paras = paragraphs(row.body);
  if (!paras.length) {
    say(`skipped ${row.id} — the submission has an empty body`);
    return;
  }

  const title = titleFrom(paras);
  const slug = slugify(title) ?? `story-${String(row.id).slice(0, 8)}`;
  const { topic, guessed } = topicFor(row.door);
  const format = formatOf(row.format) ?? FORMATS[0];

  const { data: existing } = await supabase
    .from('story_entries')
    .select('id')
    .eq('id', slug)
    .maybeSingle();

  if (existing && !force) {
    say(`"${slug}" is already in the index — left alone (--force to rewrite)`);
    return;
  }

  const entry = buildEntry(row, { slug, title, topic, format });

  const { error } = await supabase.from('story_entries').upsert(entry);
  if (error) {
    say(`could not write "${slug}" — ${error.message}`);
    return;
  }

  // Record which entry this submission became — the column the desk's own
  // publishing flow writes, and the only thing tying the two tables together.
  // Without it the desk reports a story that is on the site as "not on the
  // site", and cannot take it down when the decision changes, because it does
  // not know what to remove.
  //
  // Only when nothing is recorded yet: the desk's permalink is a reviewer's
  // and this one is a guess, so a guess never overwrites it. That is also what
  // keeps `--force` from looping — this write is a `stories` change, and a
  // `stories` change is what wakes this script up.
  if (!row.published_as) {
    const { error: linkError } = await supabase
      .from('stories')
      .update({ published_as: slug })
      .eq('id', row.id);
    if (linkError) say(`  wrote the entry but not the link back — ${linkError.message}`);
  }

  say(`published "${title}" → /story/all?story=${slug}`);
  if (guessed) {
    say(`  topic guessed as "${topic}" (the door was "${row.door ?? '—'}") — change it in Studio if it is wrong`);
  }
  if (!formatOf(row.format)) {
    say(`  format defaulted to "${format}" — the submission carried none`);
  }

  if (!mapToo) return;

  const point = buildPoint(entry, row);
  const { error: mapError } = await supabase.from('constellation_points').upsert(point);
  if (mapError) {
    say(`  the index has it, the map does not — ${mapError.message}`);
  } else if (!point.arc) {
    say('  placed on the map, but with no arc — the submission carried no arc_stage');
  } else {
    say(`  and placed on the map at ${point.month}, arc ${point.arc}`);
  }
}

/** Everything already approved, for the ones that were published while this was off. */
async function sweep() {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: true });

  if (error) {
    say(`could not read the intake table — ${error.message}`);
    return;
  }
  for (const row of data ?? []) await promote(row);
}

/* ----------------------------------------------------------------- watch */

say(`watching ${url}`);
await sweep();

if (once) process.exit(0);

const channel = supabase
  .channel('promote-watch')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, ({ new: row, old }) => {
    if (!row) return;
    if (row.status === 'published') {
      promote(row);
      return;
    }
    // Declining something already published is a real decision, and it is not
    // this script's to act on: it would be guessing at what a status change
    // meant. The desk does not have to guess — `declineStory` hides the entry
    // and the point as part of the same press — so this only says what it saw.
    if (old?.status === 'published') {
      say(`${row.id} is no longer published — the desk hides its entry; a status changed elsewhere does not`);
    }
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') say('ready — approve a story at /review and it goes live');
    if (status === 'CHANNEL_ERROR') say('lost the subscription; retrying');
  });

process.on('SIGINT', async () => {
  await supabase.removeChannel(channel);
  say('stopped');
  process.exit(0);
});
