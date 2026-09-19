import { describe, expect, it } from 'vitest';
import { WALL_CARDS, wall, type WallItem } from './story-wall';

/**
 * The wall at the foot of /story, tested without a page or a database.
 *
 * It is worth its own file because it is the kind of rule that is wrong
 * quietly: a card pinned at the desk that never appears, or a story taken off
 * the wall that is still on it. Nothing throws either way — the page renders
 * twelve cards, just not the twelve somebody chose.
 */

/** A story, as the wall reads one: where it was pinned, and when it went up. */
type Row = WallItem & { id: string };

/** `n` stories on `n` different days, newest first: `s1` is the most recent. */
function collection(n: number): Row[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `s${index + 1}`,
    date: new Date(Date.UTC(2026, 8, 30 - index)).toISOString().slice(0, 10),
  }));
}

const ids = (items: Row[]) => items.map((item) => item.id);

describe('the wall', () => {
  it('is the most recent twelve when nothing is pinned', () => {
    const shown = wall(collection(20));

    expect(shown).toHaveLength(WALL_CARDS);
    expect(ids(shown)[0]).toBe('s1');
    expect(ids(shown).at(-1)).toBe('s12');
  });

  it('shows the whole collection when it is smaller than the wall', () => {
    expect(wall(collection(5))).toHaveLength(5);
  });

  it('takes the bundled collection, which has no such column at all', () => {
    // `STORY_ENTRIES` is generated from site/data and carries no `wallOrder`.
    // Undefined has to read as "not pinned" rather than as rank zero, or a
    // build with no database keys would draw the wall in reverse.
    const bundled = collection(3).map(({ date }) => ({ date }));

    expect(wall(bundled).map((item) => item.date)).toEqual([
      '2026-09-30',
      '2026-09-29',
      '2026-09-28',
    ]);
  });

  it('puts a pinned story first, however old it is', () => {
    const rows = collection(20);
    rows[19].wallOrder = 1;

    expect(ids(wall(rows))[0]).toBe('s20');
  });

  it('orders the pinned ones by their number, then fills by date', () => {
    const rows = collection(20);
    rows[14].wallOrder = 2;
    rows[19].wallOrder = 1;

    const shown = ids(wall(rows));

    expect(shown.slice(0, 3)).toEqual(['s20', 's15', 's1']);
    expect(shown).toHaveLength(WALL_CARDS);
  });

  it('breaks a tie between two pinned at the same number by date', () => {
    const rows = collection(20);
    rows[5].wallOrder = 1;
    rows[10].wallOrder = 1;

    // A duplicate is not an error — the column is deliberately not unique, so
    // that swapping two cards cannot fail half way and leave the wall stuck.
    expect(ids(wall(rows)).slice(0, 2)).toEqual(['s6', 's11']);
  });

  it('is exactly the pinned ones once twelve are pinned', () => {
    const rows = collection(20);
    // The twelve oldest, pinned in order. The newest story in the collection
    // is `s1`, and the whole point is that it does not appear.
    for (let index = 0; index < WALL_CARDS; index += 1) rows[19 - index].wallOrder = index + 1;

    const shown = ids(wall(rows));

    expect(shown).toHaveLength(WALL_CARDS);
    expect(shown[0]).toBe('s20');
    expect(shown).not.toContain('s1');
  });

  it('leaves the rows it was given alone', () => {
    const rows = collection(3);
    rows[2].wallOrder = 1;

    wall(rows);

    // The hook keeps the fetched rows in state and sorts on every render, so a
    // sort in place would reorder the state as a side effect of drawing it.
    expect(ids(rows)).toEqual(['s1', 's2', 's3']);
  });
});
