import type { EntryRow } from '../lib/services/review';
import { wallItemOf } from '../lib/services/review';
import { wall } from '../lib/story-wall';
import type { DeskRow } from './filters';

/**
 * One story, however many tables it is in.
 *
 * The desk held two lists of stories and a person had to hold the join in their
 * head: `stories` is what a visitor sent, `story_entries` is what the site
 * serves, and the same story is usually both. Two lists meant asking "is this
 * one up?" by looking somewhere else, and it meant the collection — most of
 * which predates the submission form — sat in a place the queue never mentioned.
 *
 * So this is the join, done once, in one place that can be tested without a
 * screen. What it does **not** do is merge the two facts underneath. "Decided
 * here" and "on the site" stay separate on the item and separate in the rail,
 * because they genuinely come apart: a story can be marked published and never
 * have been carried across, and an entry can be serving that no submission ever
 * produced. Merging the lists is a convenience; merging those two would be a
 * lie the desk exists to prevent.
 */

export interface StoryItem {
  /** The list key: the permalink when there is one, else the submission's uuid. */
  key: string;
  /** What somebody sent, if anybody did. */
  sent: DeskRow | null;
  /** What the site is serving, if it is serving anything. */
  entry: EntryRow | null;
  /** Which card on the wall at the foot of /story, or null for none. */
  place: number | null;
  /** Which of the three runs this belongs to. */
  where: Where;
  /** The day the list sorts by: published if it is up, sent if it is not. */
  day: string;
}

/**
 * The three questions a reviewer actually has, in the order they have them.
 *
 * `waiting` is the work. `live` is what the public can read right now. `off` is
 * everything else that exists — declined, taken down, or marked published years
 * before anything could carry it across — which is neither work nor live but
 * must stay findable, because nothing here is ever deleted.
 */
export type Where = 'waiting' | 'live' | 'off';
export const WHERE: Where[] = ['waiting', 'live', 'off'];

/**
 * The two tables as one list.
 *
 * `stories.published_as` is the only thing connecting them — deliberately not a
 * foreign key, because a uuid the form generated and a permalink a reviewer
 * wrote are different kinds of thing, and renaming an entry must not erase what
 * was decided in the queue. So the join is by that column and nothing else.
 *
 * A permalink can be claimed by more than one submission: publishing the same
 * story twice is an editor correcting a headline, and the second press writes
 * `published_as` on a second row. The newest claim wins, because that is the
 * press that last wrote the entry; the older submission stays in the list as
 * itself, with no entry attached, which is what it is.
 */
export function combine(sent: DeskRow[], entries: EntryRow[]): StoryItem[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  // Which card each served entry is on, asked of the same function the page
  // asks, so "on the wall · 3" here and the third card there are one fact.
  const places = new Map(
    wall(entries.filter((entry) => !entry.hidden).map(wallItemOf)).map((item, index) => [
      item.id,
      index + 1,
    ]),
  );

  // Newest first, so the first claim on a permalink is the one that stands.
  const claims = [...sent].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const claimed = new Set<string>();
  const items: StoryItem[] = [];

  for (const row of claims) {
    const permalink = (row.row as { published_as?: string | null }).published_as ?? null;
    const entry = permalink && !claimed.has(permalink) ? (byId.get(permalink) ?? null) : null;
    if (entry) claimed.add(entry.id);

    items.push(item(row, entry, places));
  }

  // Everything the site is serving that nobody sent: the collection as it was
  // before the form existed, seeded from site/data. Most of the wall, today.
  for (const entry of entries) {
    if (!claimed.has(entry.id)) items.push(item(null, entry, places));
  }

  return items;
}

function item(
  sent: DeskRow | null,
  entry: EntryRow | null,
  places: Map<string, number>,
): StoryItem {
  const place = entry && !entry.hidden ? (places.get(entry.id) ?? null) : null;

  return {
    key: entry?.id ?? sent?.id ?? '',
    sent,
    entry,
    place,
    where: whereOf(sent, entry),
    day: entry?.published_on ?? sent?.day ?? '',
  };
}

/**
 * Which run an item belongs to.
 *
 * Waiting comes first even when the story is also up, because a row nobody has
 * decided is the one thing on this screen that is asking for something. In
 * practice the two do not overlap — a pending submission has nothing published
 * — but the order says which question wins if they ever do.
 */
function whereOf(sent: DeskRow | null, entry: EntryRow | null): Where {
  if (sent?.waiting) return 'waiting';
  if (entry && !entry.hidden) return 'live';
  return 'off';
}

/**
 * The three runs, each in its own order.
 *
 * `live` is in the page's order rather than by date: the wall's cards first, in
 * the order the wall draws them, then everything else newest first. A reviewer
 * looking at the live run is looking at the site, so it should read like the
 * site. The other two are chronological, and honour the queue's own
 * newest/oldest control — neither of them is a wall.
 */
export function groupStories(
  items: StoryItem[],
  order: 'newest' | 'oldest' = 'newest',
): Record<Where, StoryItem[]> {
  const byDay = (a: StoryItem, b: StoryItem) =>
    order === 'oldest' ? a.day.localeCompare(b.day) : b.day.localeCompare(a.day);

  const byPlace = (a: StoryItem, b: StoryItem) =>
    (a.place ?? Infinity) - (b.place ?? Infinity) || b.day.localeCompare(a.day);

  const runs: Record<Where, StoryItem[]> = { waiting: [], live: [], off: [] };
  for (const entry of items) runs[entry.where].push(entry);

  runs.waiting.sort(byDay);
  runs.live.sort(byPlace);
  runs.off.sort(byDay);

  return runs;
}

/* -------------------------------------------------------------- the wall */

/** One row's new place on the wall, as `setWall` writes it. */
export interface WallMove {
  id: string;
  wall_order: number | null;
}

/**
 * Every move rewrites the whole pinned run rather than swapping two values.
 *
 * A swap leaves whatever else was there — duplicates from a hand edit, gaps
 * from an unpin — and the next press then appears to do nothing. Writing 1…n
 * every time means the column is always a clean sequence, and "move up" is
 * true whatever state the row arrived in.
 */
const renumber = (order: string[]): WallMove[] =>
  order.map((id, index) => ({ id, wall_order: index + 1 }));

/**
 * Pinning puts the card **on the wall**, which means first.
 *
 * It used to append, and that was a button that lied: once twelve cards were
 * pinned the wall had no room left, so pinning a thirteenth story wrote it a
 * rank nothing shows and the screen did not change. A story is pinned at the
 * moment somebody decides it belongs on the front — so it goes to the front,
 * and whatever was twelfth falls off the wall while staying pinned behind it.
 * "Move down" is right there if first is too strong.
 */
export function pinned(order: string[], id: string): WallMove[] {
  return renumber([id, ...order.filter((entry) => entry !== id)]);
}

/** Unpinned, and the rest closed up so the numbers stay a clean sequence. */
export function unpinned(order: string[], id: string): WallMove[] {
  return [{ id, wall_order: null }, ...renumber(order.filter((entry) => entry !== id))];
}

/** One step up or down the pinned run. Off either end is not a move. */
export function moved(order: string[], id: string, by: -1 | 1): WallMove[] {
  const list = [...order];
  const at = list.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.length) return [];

  list.splice(to, 0, ...list.splice(at, 1));
  return renumber(list);
}

/** The wall as it stands, pinned exactly as it stands. */
export function pinnedAll(order: string[]): WallMove[] {
  return renumber(order);
}

/** Every pin dropped, so the date decides again. */
export function unpinnedAll(order: string[]): WallMove[] {
  return order.map((id) => ({ id, wall_order: null }));
}

/**
 * The state filter, in the desk's vocabulary rather than in any one column.
 *
 * Not `status` and not `hidden`: what a reviewer wants to narrow to is a
 * sentence about where a story stands, and each of these reads off whichever
 * table can answer it.
 */
export type StoryState = '' | 'waiting' | 'live' | 'wall' | 'hidden' | 'draft' | 'off';

export function inState(item: StoryItem, state: StoryState): boolean {
  switch (state) {
    case '':
      return true;
    case 'waiting':
      return item.where === 'waiting';
    case 'live':
      return item.where === 'live';
    case 'wall':
      return item.place !== null;
    case 'hidden':
      return Boolean(item.entry?.hidden);
    case 'draft':
      return Boolean(item.entry?.draft);
    case 'off':
      return item.where === 'off';
  }
}

/** How many are in each state, for the filter's own counts. */
export function tally(items: StoryItem[]): Record<Exclude<StoryState, ''>, number> {
  const count = (state: Exclude<StoryState, ''>) =>
    items.filter((entry) => inState(entry, state)).length;

  return {
    waiting: count('waiting'),
    live: count('live'),
    wall: count('wall'),
    hidden: count('hidden'),
    draft: count('draft'),
    off: count('off'),
  };
}

/**
 * The words this item can be searched by.
 *
 * A submission already carries a haystack built when it was read. An entry
 * carries none, and the two halves are searched together — somebody looking for
 * a headline should find the story whether the headline is on the card or in
 * what was sent, and whichever of the two the story happens to have.
 */
export function matches(item: StoryItem, needle: string, entryText: (row: EntryRow) => string) {
  if (!needle) return true;

  const sent = item.sent?.haystack ?? '';
  const entry = item.entry ? entryText(item.entry) : '';
  return `${sent} ${entry}`.includes(needle);
}
