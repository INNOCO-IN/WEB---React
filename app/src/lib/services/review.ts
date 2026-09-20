import { supabase, STORY_MEDIA_BUCKET } from '../supabase';
import type { Database } from '../database.types';
import { byWall, type WallItem } from '../story-wall';
import { workshops } from '../content/workshops';
import type { SecondFactorPolicy } from '../second-factor';
import { LOCALES, LOCALE_PREFIX, type Locale } from '../../i18n/locales';
import {
  FORMATS,
  TOPICS,
  buildEntry,
  buildPoint,
  composeEntry,
  copyOf,
  paragraphs,
  pointOf,
  slugify,
  titleFrom,
  type NewStory,
  type PublishChoices,
  type StoryCopy,
  type StorySubmission,
} from '../story-promotion';

/**
 * Reads and writes for the review desk.
 *
 * Separate from `services/content.ts` on purpose. That file is the public
 * site's reader: it falls back to bundled copy, reports which copy a page is
 * showing, and treats an error as "show the visitor something anyway". None of
 * that is right here. A reviewer looking at an empty list needs to know whether
 * the list is empty or the query failed, and there is no bundled copy of what
 * someone sent this morning — so every function here returns the error instead
 * of swallowing it.
 *
 * Nothing in this file grants access. RLS does, through `is_staff()`; signing
 * in and receiving an empty list is the correct experience for someone who is
 * not on the allowlist.
 */

export type IntakeTable = 'stories' | 'submissions' | 'workshop_registrations';

export type StoryRow = Database['public']['Tables']['stories']['Row'];
export type SubmissionRow = Database['public']['Tables']['submissions']['Row'];
export type RegistrationRow = Database['public']['Tables']['workshop_registrations']['Row'];
export type IntakeRow = StoryRow | SubmissionRow | RegistrationRow;

/**
 * What each table's `status` may become, in the order a reviewer moves through.
 *
 * The database stores these as free text with a default rather than an enum, so
 * this is the app's copy of a vocabulary the schema does not enforce. Keep the
 * two in step: a status invented here would be written happily and then match
 * no filter anywhere.
 */
export const STATUSES: Record<IntakeTable, readonly string[]> = {
  stories: ['pending', 'published', 'declined'],
  submissions: ['new', 'contacted', 'archived'],
  workshop_registrations: ['new', 'contacted', 'archived'],
};

/** The status a row arrives with — the head of each queue. */
export const INBOX: Record<IntakeTable, string> = {
  stories: 'pending',
  submissions: 'new',
  workshop_registrations: 'new',
};

/**
 * The status a run of rows may be moved to at once.
 *
 * Archive, and only archive. Clearing forty old enquiries in one press is an
 * honest act; claiming you contacted forty people is not, and `published` is a
 * story-by-story editorial decision — which is why `stories` is absent here
 * altogether rather than present with an empty list.
 */
export const BULK_STATUS: Partial<Record<IntakeTable, string>> = {
  submissions: 'archived',
  workshop_registrations: 'archived',
};

export interface Result<T> {
  rows: T[];
  /** Null when the read succeeded, including when it succeeded with no rows. */
  error: string | null;
}

const NOT_CONFIGURED = 'This build has no database keys, so there is nothing to review.';

/**
 * One table's rows, newest first.
 *
 * No status filter: a reviewer needs to see what was declined last week as
 * readily as what arrived today, and these tables are small enough that paging
 * them would be ceremony. The page groups them.
 */
export async function fetchIntake<T>(table: IntakeTable, limit = 500): Promise<Result<T>> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as T[], error: null };
}

/** One row, read on its own — the reading view and the publishing flow. */
export async function fetchStory(id: string): Promise<{ row: StoryRow | null; error: string | null }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED };

  const { data, error } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
  if (error) return { row: null, error: error.message };
  return { row: data, error: null };
}

/**
 * Moves one row through review.
 *
 * Returns the error rather than throwing, because the caller is a button and
 * the honest response to a failed write is to put the row back the way it was
 * and say why — not to leave the list showing a change the database refused.
 *
 * Two of a story's three statuses are not reachable from here, because for a
 * story a decision is not one column: `published` writes the index entry and
 * `declined` removes it. Both are refused rather than quietly written, since
 * the damage either way is silent — a story marked published that no page
 * serves, or a declined one the site goes on serving.
 */
export async function setStatus(table: IntakeTable, id: string, status: string): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;
  if (!STATUSES[table].includes(status)) return `"${status}" is not a status for ${table}.`;
  if (table === 'stories' && status !== 'pending') {
    return `A story is moved to "${status}" through the publishing flow, not here.`;
  }

  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  return error ? error.message : null;
}

/** The same move, for a run of rows. Archive only — see `BULK_STATUS`. */
export async function archiveMany(table: IntakeTable, ids: string[]): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;
  if (!ids.length) return null;

  const status = BULK_STATUS[table];
  if (!status) return `${table} rows are decided one at a time.`;

  const { error } = await supabase.from(table).update({ status }).in('id', ids);
  return error ? error.message : null;
}

/**
 * Whether the signed-in address is on the allowlist.
 *
 * Asked so the page can tell "you are not staff" apart from "there is nothing
 * to review", which look identical through RLS — both are an empty list. The
 * allowlist has its own staff-only read policy, so a non-staff session gets
 * nothing back here too, which is the answer.
 */
export async function isStaff(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from('staff_emails').select('email').limit(1);
  return !error && (data?.length ?? 0) > 0;
}

/**
 * On the allowlist — asked without the second factor in the way.
 *
 * `isStaff()` above reads the roster, and since
 * `20260919180000_second_factor_on_the_desk.sql` that read is itself behind
 * `is_staff()`, which now wants aal2. So at aal1 it answers false for a
 * reviewer of ten years' standing, and the desk would tell them they are not
 * staff when what is true is that they have not typed their code yet.
 *
 * This asks the narrower question. It is a function rather than a select
 * because a boolean about yourself is all the desk needs and all anyone should
 * be able to get: the roster stays behind the full check.
 */
export async function onStaffList(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('on_staff_list');
  return !error && data === true;
}

/**
 * How hard the second factor bites, as the database currently has it.
 *
 * Read rather than compiled in, because the switch is a row somebody flips
 * when the reviewers have been told — not something that waits for a deploy.
 * The desk reads it to pick a screen; `second_factor_ok()` reads the same row
 * to decide the actual answer, so the page cannot talk the database into a
 * different one by getting this wrong.
 *
 * An unreachable or unmigrated database falls back to `enrolled`, matching the
 * SQL's own coalesce. A build pointed at a project without this migration then
 * behaves exactly as it did before there was a second factor, which is the
 * honest reading of a database that has never heard of one.
 */
export async function fetchSecondFactorPolicy(): Promise<SecondFactorPolicy> {
  if (!supabase) return 'enrolled';

  const { data, error } = await supabase.from('review_policy').select('second_factor').limit(1).maybeSingle();
  if (error || !data) return 'enrolled';

  const value = data.second_factor;
  return value === 'off' || value === 'required' ? value : 'enrolled';
}

/* ------------------------------------------------------------------- news */

/**
 * The fourth queue, and the one that is not intake.
 *
 * The other three hold what visitors sent: rows this site created, which nobody
 * writes but the person who sent them, and which the desk only ever moves
 * through a status. News is the opposite — it is content the site *publishes*,
 * it arrives from `site/data` through `extract-content.mjs`, and what the desk
 * does to it is edit it. So it is deliberately not an `IntakeTable`: `waiting`,
 * `edition` and the arrival filters all mean something on a submission and
 * nothing here, and forcing it into that shape would have meant four queues
 * sharing a vocabulary that fits three of them.
 */
export type NewsRow = Database['public']['Tables']['news']['Row'];

/** `draft | live | archived`, as the column's own comment gives them. */
export const NEWS_STATUSES = ['draft', 'live', 'archived'] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

/** The fields the desk may type into, per language. */
export interface NewsEdit {
  kind: string;
  eyebrow: string;
  title: string;
  body: string;
  kind_ko: string;
  eyebrow_ko: string;
  title_ko: string;
  body_ko: string;
  kind_zh_tw: string;
  eyebrow_zh_tw: string;
  title_zh_tw: string;
  body_zh_tw: string;
}

export const NEWS_FIELDS = ['kind', 'eyebrow', 'title', 'body'] as const;
export type NewsField = (typeof NEWS_FIELDS)[number];

/** The column a field takes in a given edition — `title`, `title_ko`, … */
export function newsColumn(field: NewsField, locale: Locale): keyof NewsEdit {
  if (locale === 'en') return field;
  const suffix = locale === 'ko' ? '_ko' : '_zh_tw';
  return `${field}${suffix}` as keyof NewsEdit;
}

/** A row as the editor holds it — every field a string, so inputs stay controlled. */
export function newsEditOf(row: NewsRow): NewsEdit {
  const read = (key: keyof NewsRow) => String((row as Record<string, unknown>)[key] ?? '');

  return {
    kind: read('kind'),
    eyebrow: read('eyebrow'),
    title: read('title'),
    body: read('body'),
    kind_ko: read('kind_ko'),
    eyebrow_ko: read('eyebrow_ko'),
    title_ko: read('title_ko'),
    body_ko: read('body_ko'),
    kind_zh_tw: read('kind_zh_tw'),
    eyebrow_zh_tw: read('eyebrow_zh_tw'),
    title_zh_tw: read('title_zh_tw'),
    body_zh_tw: read('body_zh_tw'),
  };
}

/**
 * Every news row, drafts and archive included.
 *
 * `fetchNews` in `services/content.ts` is the site's reader and answers with
 * live rows only, because that is what a page may show. This is the desk's, and
 * the two states the site hides are the two a reviewer most needs — so it asks
 * for everything and lets the staff read policy decide. A non-staff session
 * gets the live rows back instead of an error, which is RLS working; the desk
 * already tells that apart with `isStaff()`.
 */
export async function fetchNewsQueue(limit = 500): Promise<Result<NewsRow>> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as NewsRow[], error: null };
}

/**
 * Writes one news row, and records that the desk was the one that wrote it.
 *
 * `edited_at` is not bookkeeping. `seed.sql` is generated from `site/data` and
 * its upsert overwrites this table's English copy and its status on every run —
 * so without a mark on the row, the next `npm run extract-content` would revert
 * whatever was typed here, silently, with the page still rendering. The
 * generator reads this column and holds those five columns back for any row
 * that carries it. Stamping it is therefore part of the write rather than a
 * detail of it, which is why both the status move and the copy edit come
 * through this one function.
 *
 * An empty string is stored as null: the columns are nullable and the site
 * falls back field by field, so a cleared headline has to read as absent rather
 * than as a title of zero length.
 */
export async function saveNews(
  id: string,
  patch: Partial<NewsEdit> & { status?: NewsStatus },
  by: string,
): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;

  const { status, ...words } = patch;
  if (status && !NEWS_STATUSES.includes(status)) {
    return `"${status}" is not a status for news.`;
  }

  const update: Database['public']['Tables']['news']['Update'] = {
    edited_at: new Date().toISOString(),
    edited_by: by,
  };
  if (status) update.status = status;

  for (const key of Object.keys(words) as (keyof NewsEdit)[]) {
    const value = words[key];
    if (value === undefined) continue;

    // `title` is the one column here the schema requires. Every other field may
    // be cleared — the site falls back field by field, so an item with no
    // Korean eyebrow reads in English and loses nothing — but an item with no
    // English headline is not an item. Refused here rather than sent, because
    // the database would refuse it too and a not-null violation surfaces as a
    // bug rather than as the sentence a reviewer needs.
    if (key === 'title') {
      if (!value.trim()) return 'A news item needs an English title. The other fields may be left empty.';
      update.title = value;
      continue;
    }

    update[key] = value.trim() === '' ? null : value;
  }

  const { error } = await supabase.from('news').update(update).eq('id', id);
  return error ? error.message : null;
}

/* ---------------------------------------------------------------- the wall */

/**
 * The published collection — what `/story` and `/story/all` are showing.
 *
 * A third shape again, and for a third reason. An intake row is something a
 * visitor sent and the desk moves; a news item is something the register wrote
 * and the desk edits; a story entry is something the desk itself put on the
 * site, and the question it asks is neither "who is waiting" nor "what does it
 * say" but "is this still right, and should it be on the front".
 *
 * Nothing could ask it before. Publishing writes these rows
 * (20260914090000) and declining hides one (20260917090000), but both begin at
 * a submission — and most of the collection never was one. Those rows came from
 * `seed-stories.sql`, so until now correcting a card meant editing
 * `site/data/stories.js` and re-running two scripts.
 */
export type EntryRow = Database['public']['Tables']['story_entries']['Row'];

/**
 * The two editions a story entry is written in.
 *
 * Not `EDITIONS`, which is every language the site speaks. The table has two
 * `jsonb` columns, `en` and `ko`, and the Chinese pages read the English side
 * (`ENTRY_KEY` in `logic/StoryEN.ts`) — so offering a ZH-TW tab here would be
 * offering somewhere to type that nothing would ever read back.
 */
export const ENTRY_EDITIONS: Locale[] = ['en', 'ko'];

/** The words on a card, in one edition. `paras` is the full text, one per line. */
export const ENTRY_WORDS = ['eyebrow', 'title', 'body', 'credit', 'paras'] as const;
export type EntryWord = (typeof ENTRY_WORDS)[number];

/** Everything the desk may type into. Flat, and every value a string. */
export interface EntryEdit {
  eyebrow: string;
  title: string;
  body: string;
  credit: string;
  paras: string;
  eyebrow_ko: string;
  title_ko: string;
  body_ko: string;
  credit_ko: string;
  paras_ko: string;
  /** The row's own columns — the same for both editions. */
  published_on: string;
  topic: string;
  format: string;
  image: string;
}

/** The key a word takes in a given edition — `title`, `title_ko`. */
export function entryColumn(word: EntryWord, locale: Locale): keyof EntryEdit {
  return (locale === 'ko' ? `${word}_ko` : word) as keyof EntryEdit;
}

/**
 * A row as the editor holds it.
 *
 * Paragraphs become one string with a blank line between them, which is how
 * they were typed in the first place and how `paragraphs()` reads them back —
 * the same round trip the publishing screen makes, so a story promoted from a
 * submission and a story edited here cannot end up shaped differently.
 */
export function entryEditOf(row: EntryRow): EntryEdit {
  const en = copyOf(row.en);
  const ko = copyOf(row.ko);
  const text = (value: string | null | undefined) => String(value ?? '');

  return {
    eyebrow: text(en.eyebrow),
    title: text(en.title),
    body: text(en.body),
    credit: text(en.credit),
    paras: (en.paras ?? []).join('\n\n'),
    eyebrow_ko: text(ko.eyebrow),
    title_ko: text(ko.title),
    body_ko: text(ko.body),
    credit_ko: text(ko.credit),
    paras_ko: (ko.paras ?? []).join('\n\n'),
    published_on: String(row.published_on ?? '').slice(0, 10),
    topic: row.topic,
    format: row.format,
    image: text(row.image),
  };
}

/**
 * One edition's copy, rebuilt from the editor and merged over what is there.
 *
 * Merged rather than replaced: `en` and `ko` are `jsonb` and some rows carry a
 * `kicker` the desk has no field for. Writing a fresh object would drop it
 * silently, and the page would simply stop showing something nobody had
 * decided to remove.
 */
export function entryCopy(current: StoryCopy, edit: EntryEdit, locale: Locale): StoryCopy {
  const read = (word: EntryWord) => edit[entryColumn(word, locale)].trim();

  return {
    ...current,
    eyebrow: read('eyebrow') || null,
    title: read('title'),
    body: read('body'),
    credit: read('credit') || null,
    paras: paragraphs(read('paras')),
  };
}

/**
 * Writes one entry, and records that the desk was the one that wrote it.
 *
 * `edited_at` is not bookkeeping, for the reason `saveNews` gives: the seed
 * generated from `site/data/stories.js` overwrites every column below on every
 * run, and the clause that holds them back reads this column. Stamping it is
 * part of the write rather than a detail of it.
 *
 * Takes the row rather than only its id, because two of the columns are `jsonb`
 * and a patch has to be merged into what is already in them.
 */
export async function saveEntry(
  row: EntryRow,
  patch: Partial<EntryEdit> & { draft?: boolean },
  by: string,
): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;

  const edit = { ...entryEditOf(row), ...patch };

  // Refused here rather than sent. A card with no headline is not a card, and
  // the database would take it happily — `title` lives inside the jsonb, where
  // no not-null constraint reaches it, so nothing downstream would complain
  // and the wall would simply render a card with a hole in it.
  if (!edit.title.trim()) {
    return 'A story needs an English title — it is what the card and the index show.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edit.published_on)) {
    return 'The published date has to be a day, as YYYY-MM-DD. It is what orders the collection.';
  }
  if (!FORMATS.includes(edit.format)) return `"${edit.format}" is not one of the formats.`;
  if (!TOPICS.includes(edit.topic)) return `"${edit.topic}" is not one of the topics.`;

  const update: Database['public']['Tables']['story_entries']['Update'] = {
    published_on: edit.published_on,
    topic: edit.topic,
    format: edit.format,
    image: edit.image.trim() || null,
    en: entryCopy(copyOf(row.en), edit, 'en') as unknown as EntryRow['en'],
    ko: entryCopy(copyOf(row.ko), edit, 'ko') as unknown as EntryRow['ko'],
    edited_at: new Date().toISOString(),
    edited_by: by,
  };
  if (patch.draft !== undefined) update.draft = patch.draft;

  const { error } = await supabase.from('story_entries').update(update).eq('id', row.id);
  return wrote(error);
}

/**
 * Takes an entry off the site, or puts it back.
 *
 * No `edited_at`, and that is deliberate. `hidden` is not in the seed's column
 * list, so no re-seed can undo this — and stamping the row anyway would freeze
 * its words against `site/data` as a side effect of a decision about whether it
 * is served, which is the opposite of what that column is for.
 */
export async function hideEntry(id: string, hidden: boolean): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.from('story_entries').update({ hidden }).eq('id', id);
  return wrote(error);
}

/**
 * Where the entries sit on the wall at the foot of /story.
 *
 * Several rows at once because every move is one: pinning a card appends it,
 * swapping two renumbers both, and "let the date decide" clears the lot. Sent
 * in parallel and the first failure is returned — there is no transaction to be
 * had over PostgREST, and a half-applied order is a wall in an odd sequence
 * rather than anything lost, which the next press fixes.
 *
 * Unstamped, like `hideEntry` and for the same reason.
 */
export async function setWall(
  order: { id: string; wall_order: number | null }[],
): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;
  if (!order.length) return null;

  const results = await Promise.all(
    order.map(({ id, wall_order }) =>
      supabase!.from('story_entries').update({ wall_order }).eq('id', id),
    ),
  );

  return wrote(results.find((result) => result.error)?.error ?? null);
}

/**
 * A write refused because the database is older than the screen asking.
 *
 * `42703` is Postgres for "no such column", and every write below names a
 * column that arrived in 20260919160000. A project a migration behind answers
 * it, and the raw sentence — `column story_entries.wall_order does not exist` —
 * names the column rather than the gap, which reads as a bug in the desk. This
 * says what is actually true, and keeps the original in brackets for whoever
 * has to fix it.
 */
function wrote(error: { code?: string; message: string } | null): string | null {
  if (!error) return null;
  if (error.code !== '42703') return error.message;

  return (
    'This database has not been updated for this screen yet, so the change was not saved. ' +
    'It needs the migration 20260919160000_the_wall_on_story.sql — see SUPABASE.md. ' +
    `(${error.message})`
  );
}

/**
 * What is wrong with a story somebody is writing, in one sentence, or null.
 *
 * Pure, and separate from the write, for two reasons: the screen wants to grey
 * out its own button before anybody presses it, and a rule about what makes a
 * publishable story is worth being able to test without a database.
 *
 * It does not ask whether the permalink is free — that is a question only the
 * database can answer, and `permalinkTaken` asks it at the last moment.
 */
export function whyNot(story: NewStory): string | null {
  if (!story.slug) return 'A story needs a permalink — it is the address the whole site links to.';
  if (story.slug !== slugify(story.slug)) {
    return 'A permalink is lowercase words joined by hyphens, and nothing else.';
  }
  if (!story.title.trim()) return 'A story needs an English title — the card and the index show it.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(story.date)) {
    return 'The published date has to be a day, as YYYY-MM-DD. It is what orders the collection.';
  }
  if (!FORMATS.includes(story.format)) return `"${story.format}" is not one of the formats.`;
  if (!TOPICS.includes(story.topic)) return `"${story.topic}" is not one of the topics.`;
  if (!(story.blurb ?? '').trim() && !(story.body ?? '').trim()) {
    return 'A story needs either a blurb or a body — the card has to say something.';
  }
  return null;
}

/**
 * Writes a story the desk is publishing itself, with no submission behind it.
 *
 * The other half of `publishStory`. That one starts from something a visitor
 * sent; this one starts from nothing, which is how most of the collection got
 * here — those rows came from `site/data/stories.js` and the seed, so until now
 * adding a story IN wrote itself meant editing a file and re-running two
 * scripts. Same table, same builder, same shape.
 *
 * Three things worth saying about it:
 *
 *   * **Insert, not upsert.** Publishing the same submission twice is an editor
 *     correcting a headline; typing a permalink that already exists is not — it
 *     is somebody about to overwrite a story they have not read. The screen
 *     checks with `permalinkTaken` first, and the unique key is what catches
 *     the race.
 *   * **A point on the map by default.** The publishing flow asks and defaults
 *     to no, because a submission is a story first and a light second. A story
 *     the desk sits down to write is being put on the site deliberately, so the
 *     map is the expected half rather than the extra one. It is still a
 *     checkbox.
 *   * **Stamped.** `edited_at` marks the row as the desk's. No seed will ever
 *     carry this id, so nothing would overwrite it — but the stamp is what the
 *     list reads to say where a row's words come from, and the answer is here.
 */
export async function addStory(
  story: NewStory,
  options: { constellation?: boolean; arc?: string | null },
  by: string,
): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;

  const wrong = whyNot(story);
  if (wrong) return wrong;

  const entry = composeEntry(story);
  const { error } = await supabase.from('story_entries').insert({
    ...entry,
    edited_at: new Date().toISOString(),
    edited_by: by,
  });

  if (error) {
    // 23505 is the unique violation on the permalink. The database is the only
    // thing that can know, and the sentence it gives names a constraint.
    if (error.code === '23505') {
      return `Something is already published at /story/${story.slug}. Choose another permalink.`;
    }
    return wrote(error);
  }

  if (options.constellation === false) return null;

  const { error: pointError } = await supabase
    .from('constellation_points')
    .upsert(pointOf(entry, options.arc));

  // The story is on the site either way — said as it happened, rather than
  // returned as a failure that would read as "nothing was written".
  return pointError ? `The story is on the site, but the map refused it: ${pointError.message}` : null;
}

/**
 * Puts a picture in the bucket, and answers with the URL to store on the row.
 *
 * The same two steps `SupabaseForm` takes when a visitor attaches something: a
 * uuid filename, so nothing collides and the file somebody chose is not named
 * in a public URL, then the public URL itself — `story_entries.image` is read
 * by pages nobody signs in to. The bucket's insert policy already covers
 * `authenticated` (§4 of schema.sql), so this needs no new grant and no
 * migration.
 *
 * **The picture it replaces is left in the bucket.** A file can be on the
 * Constellation, in an older version of the story, or in something somebody
 * printed, and this screen is otherwise free of irreversible presses. An
 * orphaned object costs storage; a deleted one that turns out to be in use
 * costs a picture nobody can get back.
 */
export async function uploadPicture(
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: NOT_CONFIGURED };

  const extension = file.name.split('.').pop() ?? 'bin';
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(STORY_MEDIA_BUCKET).upload(path, file);
  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(STORY_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/**
 * How many of the wall's places are pinned.
 *
 * Asked by the publishing screen, so its last look can say whether the story
 * about to be written will actually appear at the foot of `/story`. It used to
 * promise "the top of /story" unconditionally, which stopped being true the
 * moment the wall could be curated — and the way that failed was the worst
 * kind: the press worked, the story was live, and the page a reviewer went to
 * look at was unchanged.
 *
 * A database that has not run 20260919160000 has no such column, and answers
 * zero — which is the truth there: nothing is pinned, and the date decides.
 */
export async function pinCount(): Promise<number> {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('story_entries')
    .select('id', { count: 'exact', head: true })
    .not('wall_order', 'is', null)
    .eq('hidden', false);

  return error ? 0 : (count ?? 0);
}

/** A row as `lib/story-wall.ts` reads one — for the sort below, and the desk. */
export function wallItemOf(row: EntryRow): WallItem & { id: string } {
  return { id: row.id, wallOrder: row.wall_order, date: row.published_on };
}

/**
 * Every entry, hidden ones included, the wall's order first.
 *
 * `fetchStoryEntries` in `services/content.ts` is the site's reader and drops
 * the hidden rows, because that is what a page may show. This is the desk's,
 * and a story it has taken down is one of the two it most needs to be able to
 * find — the other being the one it is about to. A non-staff session gets the
 * public list back rather than an error, which is RLS working as written.
 *
 * **Ordered here rather than in the query, and that is the point.** Naming
 * `wall_order` in the request makes a database that has not run
 * 20260919160000 answer `42703 column does not exist`, and the desk then
 * cannot list the collection at all — over a column it only needs for the
 * order. The same argument `services/content.ts` makes for reading `hidden`
 * in JavaScript: a later migration must not be able to take down a read. What
 * it costs is real but small: pinning still fails on that database, loudly,
 * which is the truth about it.
 */
export async function fetchEntries(limit = 500): Promise<Result<EntryRow>> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from('story_entries')
    .select('*')
    .order('published_on', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  const rows = (data ?? []) as EntryRow[];
  rows.sort((a, b) => byWall(wallItemOf(a), wallItemOf(b)));
  return { rows, error: null };
}

/* ------------------------------------------------------------- publishing */

export interface PublishOptions extends PublishChoices {
  /** Also place the story on the Constellation map. Off unless asked. */
  constellation?: boolean;
  /** Overrides the arc the submitter placed themselves at. */
  arc?: string | null;
}

/**
 * Puts a reviewed story on the site, and records that it went.
 *
 * The one press the desk's last-look screen describes: it writes the index
 * entry, optionally places the point on the map, and marks the submission
 * `published`. There has never been a reason for those to be separate jobs —
 * but the order matters, and it is the opposite of the obvious one.
 *
 * The entry is written *first*. If the status moved first and the entry then
 * failed, the queue would show a story as published that no page serves, and
 * the desk's own rule — "published is not on the site" — would be carrying a
 * fault rather than describing a normal state. Written this way round, a failed
 * status write leaves a story that is on the site and still sitting in the
 * queue: visible, obviously unfinished, and fixed by pressing the button again.
 *
 * Upsert rather than insert, because `id` is the permalink. Publishing the same
 * story twice is a reviewer correcting a headline, not a second story.
 */
export async function publishStory(
  row: StorySubmission,
  options: PublishOptions,
): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;

  const entry = buildEntry(row, options);

  const { error: entryError } = await supabase.from('story_entries').upsert(entry);
  if (entryError) return entryError.message;

  if (options.constellation) {
    const point = buildPoint(entry, row, options.arc);
    const { error: pointError } = await supabase.from('constellation_points').upsert(point);
    // The index has it; the map did not take it. Said plainly, because the
    // reviewer's next move differs — this one is retried from the story's row,
    // not by publishing again.
    if (pointError) {
      return `The story is on the site, but the Constellation point was refused — ${pointError.message}`;
    }
  }

  // The status and the permalink in one write, because they are one fact: this
  // submission was decided, and this is what it became. `published_as` is what
  // lets the queue say "on the site" rather than only "published" — the two
  // tables share no other key, `stories.id` being a uuid the form generated and
  // the entry's id a permalink written a moment ago.
  const { error } = await supabase
    .from('stories')
    .update({ status: 'published', published_as: entry.id })
    .eq('id', String(row.id));

  return error ? error.message : null;
}

/**
 * Whether a permalink is already taken, asked before the last look.
 *
 * `id` is the primary key and the URL at once, so a collision is not a database
 * error to recover from — it is a reviewer about to overwrite a story that is
 * already on the site with a different one.
 */
export async function permalinkTaken(slug: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('story_entries').select('id').eq('id', slug).maybeSingle();
  return Boolean(data);
}

/* --------------------------------------------------- taking it back down */

/**
 * The permalink a submission is on the site as — recorded, or worked out.
 *
 * `published_as` is the recorded answer and the only one worth trusting, but it
 * is written by `publishStory` and nothing else. A story can reach the index by
 * other doors: `scripts/promote-watch.mjs` writes an entry the moment a status
 * becomes `published` from anywhere, `scripts/promote-story.mjs` prints SQL for
 * a person to run, and either leaves the column null. Those rows are the ones
 * the desk used to describe as "not on the site" while the site was serving
 * them — and now they are the ones it would fail to take down.
 *
 * So when nothing was recorded, this asks the question the scripts answered:
 * they derive the permalink from the body, through the same two functions this
 * file imports, so the desk can derive the candidate and look it up. It is a
 * guess, which is why it is not enough on its own — the entry has to agree
 * about the day and the credit as well before it is treated as this story's.
 * A script-written entry always will, because it took both from this row.
 *
 * The check matters: `id` is a permalink, two submissions can open with the
 * same sentence, and a wrong match takes somebody else's story off the site.
 * Recoverable, since nothing is deleted — but it would be recovered by whoever
 * noticed the page had gone, which is not a way to find out. Unsure reads as
 * null, and null means nothing is taken down.
 */
export async function permalinkOf(row: StorySubmission): Promise<string | null> {
  if (row.published_as) return row.published_as;
  if (!supabase) return null;

  const slug = slugify(titleFrom(paragraphs(row.body)));
  if (!slug) return null;

  const { data } = await supabase
    .from('story_entries')
    .select('published_on, en')
    .eq('id', slug)
    .maybeSingle();
  if (!data) return null;

  const entry = copyOf(data.en);
  const sameDay = data.published_on === String(row.created_at ?? '').slice(0, 10);
  const sameCredit = (entry.credit ?? null) === (row.credit_name || null);

  return sameDay && sameCredit ? slug : null;
}

/**
 * Declines a story, and takes it off the site if it was on it.
 *
 * The reverse of `publishStory`, and the reason it is not `setStatus`: for
 * every other row in the desk a decision is one column, and for a story that
 * was published it is three tables. Declining used to write only the column,
 * so a declined story went on being the newest thing on `/story/all` and went
 * on burning as a light on the Constellation. Nothing else would ever have
 * removed it — `promote-watch.mjs` sees the status change and deliberately
 * leaves the page alone, which is right for a script and wrong as the only
 * behaviour anywhere.
 *
 * **Hidden, not deleted.** An entry is not only what the submitter sent: the
 * headline, the permalink, the topic and the summary are somebody's work, and
 * so is the arc on the point. Throwing them away to express a change of mind
 * costs all of that the second time somebody changes their mind back — which
 * `publishStory` then handles by upserting `hidden: false` over the same row.
 *
 * The order is the reverse of publishing's, for the same reason it was
 * inverted there. The map goes first, then the index, then the queue. A
 * failure part-way leaves a story that is partly off the site and still reads
 * as published in the queue — visible, obviously unfinished, and finished by
 * pressing the button again, which is safe because every step writes the same
 * value to the same row.
 *
 * `published_as` is kept. The entry it names still exists, and what it records
 * is still true: this submission became that entry. It is what the desk reads
 * to say so, and what a later publish reuses.
 *
 * A story that was never published hides nothing and just records the
 * decision, which is the common case and costs one lookup.
 */
export async function declineStory(row: StorySubmission): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;

  const permalink = await permalinkOf(row);

  if (permalink) {
    const { error: pointError } = await supabase
      .from('constellation_points')
      .update({ hidden: true })
      .eq('id', permalink);
    if (pointError) return pointError.message;

    const { error: entryError } = await supabase
      .from('story_entries')
      .update({ hidden: true })
      .eq('id', permalink);
    if (entryError) return entryError.message;
  }

  const { error } = await supabase
    .from('stories')
    .update({ status: 'declined', published_as: permalink ?? row.published_as })
    .eq('id', String(row.id));

  return error ? error.message : null;
}

/* ------------------------------------------------------------ presentation */

/**
 * The edition a row was written in, read off the page it came from.
 *
 * Not a column: the forms have never asked, and adding one would say nothing
 * about the rows already in the table. The path does say — `/ko/are-you-in` was
 * read in Korean — and it is stored on every row, so the tag is derived rather
 * than migrated. A row whose `source_page` is missing or unprefixed reads as
 * English, which is what an unprefixed path means on this site.
 *
 * This is the whole reason the tag exists: the reply has to go back in the
 * language the person wrote in.
 */
export function editionOf(sourcePage: string | null | undefined): Locale {
  const path = String(sourcePage ?? '').trim();
  if (!path) return 'en';

  const first = path.replace(/^\/+/, '').split('/')[0]?.toLowerCase() ?? '';
  for (const locale of LOCALES) {
    const prefix = LOCALE_PREFIX[locale];
    if (prefix && first === prefix) return locale;
  }
  return 'en';
}

/** `EN` · `KO` · `ZH-TW` — the label the rail prints above the source path. */
export const EDITION_LABEL: Record<Locale, string> = {
  en: 'EN',
  ko: 'KO',
  'zh-TW': 'ZH-TW',
};

/** The two the desk itself is read in, which is why they come first. */
const DESK_FIRST: Locale[] = ['en', 'ko'];

/**
 * The editions, in the order the desk lists them.
 *
 * Not `LOCALES`' order — the site declares `zh-TW` second, and the desk's own
 * switch reads EN · KO, so the filter beside it should too. Built by reordering
 * `LOCALES` rather than by typing the three out, because those two lists
 * disagreeing silently is the failure that matters: a language added to the
 * site would go missing from this filter, and the rows written in it would sit
 * in the queue with a tag no control could select. This way it arrives at the
 * end rather than not at all.
 */
export const EDITIONS: Locale[] = [
  ...DESK_FIRST,
  ...LOCALES.filter((locale) => !DESK_FIRST.includes(locale)),
];

/**
 * The languages the desk itself is read in — every one the site speaks.
 *
 * An alias rather than its own union, because the two lists drifting apart is
 * the failure that would not announce itself: a language the site has and the
 * desk does not is a `BRINGS` map missing a key, and TypeScript is what should
 * say so rather than a reviewer finding an English sentence in a Chinese
 * interface.
 */
export type DeskLang = Locale;

/**
 * What each answer to "What brings you here?" means, in the desk's language.
 *
 * The form stores a slug so that one answer is one answer whichever language it
 * was given in; this is the desk's half of that bargain, and the half that
 * makes the bargain worth anything. Because the stored value carries no
 * language, the desk is free to render it in whichever language the desk is
 * being read in — a Korean-reading reviewer gets a Korean sentence for a row
 * sent in English, which is the right way round: the slug is ours, the message
 * underneath it is theirs and is never touched.
 *
 * Anything that is not one of the six is shown as it arrived. Enquiries sent
 * before the slugs carry the whole sentence, in whatever language the sender
 * happened to be reading, and the desk draws those differently rather than
 * pretending they are one of the six.
 *
 * The Korean is the design bundle's draft, pending IN's own review.
 */
export const BRINGS: Record<DeskLang, Record<string, string>> = {
  en: {
    'workshop-curious': 'Curious about a workshop',
    'workshop-for-org': 'Wants a workshop for their organisation',
    'in-the-work': 'Already in the work',
    proposal: 'Proposing something to build together',
    'keep-me-posted': 'Only wants to hear about events',
    other: 'Something else',
  },
  ko: {
    'workshop-curious': '워크숍이 궁금함',
    'workshop-for-org': '조직에 워크숍을 열고 싶어함',
    'in-the-work': '이미 함께하고 있음',
    proposal: '함께 만들 것을 제안함',
    'keep-me-posted': '행사 소식만 원함',
    other: '그 밖의 것',
  },
  // Taken from the sentences the zh-TW form itself offers
  // (`i18n/resources/zh-TW/pages/are-you-in.json`), restated about the sender
  // rather than by them — the form asks "是什麼帶你來到這裡？" in the first
  // person and the desk is reading somebody else's answer.
  'zh-TW': {
    'workshop-curious': '想了解工作坊',
    'workshop-for-org': '想在自己的組織辦工作坊',
    'in-the-work': '已經在參與了',
    proposal: '想提案，一起做點什麼',
    'keep-me-posted': '只想收到活動消息',
    other: '其他',
  },
};

/** The six the form offers. A value outside this list arrived before they did. */
export const BRINGS_SLUGS = Object.keys(BRINGS.en);

/** True for a row sent before the form stored slugs. It is left as it arrived. */
export function isPreSlug(brings: string | null | undefined): boolean {
  const value = String(brings ?? '').trim();
  return Boolean(value) && !BRINGS_SLUGS.includes(value);
}

/** `mobius-making` → `Möbius Making`. The rail keeps the slug, in mono. */
export function workshopName(slug: string | null | undefined): string {
  const key = String(slug ?? '').trim();
  if (!key) return '';

  const known = workshops.find((workshop) => workshop.slug === key);
  if (known) return known.title;

  // An unknown slug is shown as a slug rather than title-cased into something
  // that looks like a workshop nobody runs.
  return key;
}

/** Every workshop a row in this queue names, for the queue's own filter. */
export function workshopsIn(rows: RegistrationRow[]): { slug: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const slug = String(row.workshop_slug ?? '').trim();
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, name: workshopName(slug), count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
