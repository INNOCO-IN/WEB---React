import { describe, expect, it } from 'vitest';
import type { EntryRow, StoryRow } from '../lib/services/review';
import type { DeskRow } from './filters';
import {
  combine,
  groupStories,
  inState,
  moved,
  pinned as pinFirst,
  tally,
  unpinned,
} from './stories';

/**
 * The join behind the merged story list, tested without a screen.
 *
 * Every case here is one a reviewer would otherwise have to hold in their head:
 * a story that was sent and published, one that was sent and never carried
 * across, one the site serves that nobody ever sent, and the same permalink
 * claimed twice. Getting any of them wrong shows up as a story listed twice, or
 * not at all — never as an error.
 */

function sent(over: Partial<DeskRow> = {}): DeskRow {
  const row = { id: 'u1', published_as: null, status: 'pending' } as unknown as StoryRow;

  return {
    id: 'u1',
    table: 'stories',
    status: 'pending',
    createdAt: '2026-09-11T09:00:00Z',
    day: '2026-09-11',
    edition: 'en',
    sourcePage: '/story/submit',
    haystack: 'we were folding chairs',
    facets: {},
    waiting: true,
    row,
    ...over,
  };
}

/** A submission that was published as `permalink`. */
function published(id: string, permalink: string, day: string): DeskRow {
  return sent({
    id,
    status: 'published',
    waiting: false,
    day,
    createdAt: `${day}T09:00:00Z`,
    row: { id, published_as: permalink, status: 'published' } as unknown as StoryRow,
  });
}

function entry(over: Partial<EntryRow> = {}): EntryRow {
  return {
    id: 'this-is-us',
    created_at: '2026-07-16T00:00:00Z',
    published_on: '2026-07-16',
    format: 'writing',
    topic: 'signature',
    color: null,
    href: null,
    draft: false,
    hidden: false,
    image: null,
    image_fit: null,
    image_ratio: null,
    image_position: null,
    wall_order: null,
    edited_at: null,
    edited_by: null,
    en: { eyebrow: null, title: 'This is us', body: '', credit: null, paras: [] },
    ko: { eyebrow: null, title: '', body: '', credit: null, paras: [] },
    ...over,
  } as unknown as EntryRow;
}

describe('one story, however many tables it is in', () => {
  it('puts a submission and the entry it became on one line', () => {
    const items = combine([published('u1', 'this-is-us', '2026-07-16')], [entry()]);

    expect(items).toHaveLength(1);
    expect(items[0].sent?.id).toBe('u1');
    expect(items[0].entry?.id).toBe('this-is-us');
    expect(items[0].key).toBe('this-is-us');
  });

  it('keeps a submission that was never published', () => {
    const items = combine([sent()], []);

    expect(items).toHaveLength(1);
    expect(items[0].entry).toBeNull();
    expect(items[0].where).toBe('waiting');
  });

  it('keeps an entry nobody submitted, which is most of the collection', () => {
    const items = combine([], [entry()]);

    expect(items).toHaveLength(1);
    expect(items[0].sent).toBeNull();
    expect(items[0].where).toBe('live');
  });

  it('gives a permalink claimed twice to the newer claim', () => {
    // Publishing the same story again is an editor correcting a headline, and
    // it writes `published_as` on a second row. Only one of them is the entry.
    const older = published('u1', 'this-is-us', '2026-07-16');
    const newer = published('u2', 'this-is-us', '2026-08-01');

    const items = combine([older, newer], [entry()]);
    const withEntry = items.filter((item) => item.entry);

    expect(items).toHaveLength(2);
    expect(withEntry).toHaveLength(1);
    expect(withEntry[0].sent?.id).toBe('u2');
  });

  it('never lists an entry twice', () => {
    const items = combine(
      [published('u1', 'this-is-us', '2026-07-16'), published('u2', 'this-is-us', '2026-08-01')],
      [entry()],
    );

    expect(items.filter((item) => item.entry?.id === 'this-is-us')).toHaveLength(1);
  });
});

describe('where a story stands', () => {
  it('is waiting while nobody has decided, even though nothing is published', () => {
    expect(combine([sent()], [])[0].where).toBe('waiting');
  });

  it('is off the site when the entry is hidden', () => {
    const items = combine(
      [published('u1', 'this-is-us', '2026-07-16')],
      [entry({ hidden: true })],
    );

    expect(items[0].where).toBe('off');
    expect(items[0].place).toBeNull();
  });

  it('is off the site when a decision was made but nothing was carried across', () => {
    const items = combine([published('u1', 'gone', '2026-07-16')], []);

    expect(items[0].where).toBe('off');
    expect(items[0].entry).toBeNull();
  });

  it("numbers the cards the wall is showing, in the wall's order", () => {
    const items = combine(
      [],
      [
        entry({ id: 'old', published_on: '2020-01-01', wall_order: 1 }),
        entry({ id: 'new', published_on: '2026-01-01' }),
        entry({ id: 'down', published_on: '2025-01-01', hidden: true }),
      ],
    );

    const place = (id: string) => items.find((item) => item.entry?.id === id)?.place;

    // Pinned first however old, then by date. A hidden story is on no wall,
    // whatever it is pinned at, because the site does not serve it.
    expect(place('old')).toBe(1);
    expect(place('new')).toBe(2);
    expect(place('down')).toBeNull();
  });
});

describe('the three runs', () => {
  const items = combine(
    [sent(), published('u2', 'live-one', '2026-05-01')],
    [
      entry({ id: 'live-one', published_on: '2026-05-01' }),
      entry({ id: 'live-two', published_on: '2026-06-01', wall_order: 1 }),
      entry({ id: 'down', published_on: '2026-04-01', hidden: true }),
    ],
  );

  it('splits into waiting, live and off', () => {
    const runs = groupStories(items);

    expect(runs.waiting.map((item) => item.key)).toEqual(['u1']);
    expect(runs.live.map((item) => item.key)).toEqual(['live-two', 'live-one']);
    expect(runs.off.map((item) => item.key)).toEqual(['down']);
  });

  it('reads the live run in the order the page draws it, not by date', () => {
    // `live-one` is the older story and `live-two` is pinned to the front, so
    // a date sort would put them the other way round.
    expect(groupStories(items).live[0].key).toBe('live-two');
  });

  it('counts each state for the filter beside it', () => {
    expect(tally(items)).toMatchObject({ waiting: 1, live: 2, wall: 2, hidden: 1, off: 1 });
  });

  it('narrows to one state at a time', () => {
    const wall = items.filter((item) => inState(item, 'wall'));
    const hidden = items.filter((item) => inState(item, 'hidden'));

    expect(wall.map((item) => item.key)).toEqual(['live-one', 'live-two']);
    expect(hidden.map((item) => item.key)).toEqual(['down']);
  });
});

describe('moving a card on the wall', () => {
  /** A full wall: twelve pinned, in order. */
  const full = Array.from({ length: 12 }, (_, index) => `p${index + 1}`);

  it('pins a card to the front, so pinning it puts it on the wall', () => {
    // It used to append. On a full wall that wrote rank 13, which nothing
    // shows — a button that said "pin to the wall" and changed no page.
    const order = pinFirst(full, 'newcomer');

    expect(order[0]).toEqual({ id: 'newcomer', wall_order: 1 });
    expect(order).toHaveLength(13);
    expect(order.at(-1)).toEqual({ id: 'p12', wall_order: 13 });
  });

  it('does not list a card twice when it was already pinned', () => {
    const order = pinFirst(full, 'p5');

    expect(order).toHaveLength(12);
    expect(order.filter((move) => move.id === 'p5')).toHaveLength(1);
    expect(order[0].wall_order).toBe(1);
  });

  it('closes the run up when one is unpinned', () => {
    const order = unpinned(full, 'p3');

    expect(order[0]).toEqual({ id: 'p3', wall_order: null });
    expect(order.slice(1).map((move) => move.wall_order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(order.find((move) => move.id === 'p4')?.wall_order).toBe(3);
  });

  it('moves one step and renumbers the whole run, so a second press works', () => {
    const order = moved(full, 'p5', -1);

    expect(order.find((move) => move.id === 'p5')?.wall_order).toBe(4);
    expect(order.find((move) => move.id === 'p4')?.wall_order).toBe(5);
  });

  it('is not a move off either end', () => {
    expect(moved(full, 'p1', -1)).toEqual([]);
    expect(moved(full, 'p12', 1)).toEqual([]);
    expect(moved(full, 'not-pinned', -1)).toEqual([]);
  });
});
