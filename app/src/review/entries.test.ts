import { describe, expect, it } from 'vitest';
import {
  entryColumn,
  entryCopy,
  entryEditOf,
  type EntryEdit,
  type EntryRow,
  wallItemOf,
} from '../lib/services/review';
import { byWall } from '../lib/story-wall';
import type { StoryCopy } from '../lib/story-promotion';

/**
 * The story-entry editor's rules, tested without a browser or a database.
 *
 * The round trip is the whole of it: a row becomes fields, the fields come back
 * as a row, and anything the editor has no field for has to survive the journey
 * — because the way that fails is silent. The card renders, the story renders,
 * and something nobody decided to remove is simply gone.
 */

function entry(over: Partial<EntryRow> = {}): EntryRow {
  return {
    id: 'this-is-us',
    created_at: '2026-07-16T09:00:00Z',
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
    en: {
      eyebrow: 'I lived it · A classroom',
      title: '“This is us”',
      body: 'I stopped teaching and asked one real question.',
      credit: 'A teacher',
      paras: ['Twenty minutes in, no one had looked up.', 'So when I stopped, it was exhaustion.'],
    },
    ko: { eyebrow: null, title: '우리예요', body: '', credit: null, paras: [] },
    ...over,
  } as unknown as EntryRow;
}

describe('a story entry, as the editor holds it', () => {
  it('reads paragraphs as text with a blank line between them', () => {
    expect(entryEditOf(entry()).paras).toBe(
      'Twenty minutes in, no one had looked up.\n\nSo when I stopped, it was exhaustion.',
    );
  });

  it('reads an absent field as an empty string, so the input stays controlled', () => {
    const edit = entryEditOf(entry());

    expect(edit.eyebrow_ko).toBe('');
    expect(edit.credit_ko).toBe('');
    expect(edit.paras_ko).toBe('');
  });

  it("carries the row's own columns, which both editions share", () => {
    const edit = entryEditOf(entry({ image: '/story-img/brothers.jpg' }));

    expect(edit.published_on).toBe('2026-07-16');
    expect(edit.topic).toBe('signature');
    expect(edit.format).toBe('writing');
    expect(edit.image).toBe('/story-img/brothers.jpg');
  });

  it('writes the Korean words to the Korean keys', () => {
    expect(entryColumn('title', 'ko')).toBe('title_ko');
    expect(entryColumn('title', 'en')).toBe('title');
  });

  it('reads an absent wall_order as unpinned rather than as rank zero', () => {
    // A database that has not run 20260919160000 answers rows without the
    // column at all. `undefined !== null`, so a null check would call every
    // story pinned and sort the whole collection ahead of itself.
    const row = entry();
    delete (row as unknown as Record<string, unknown>).wall_order;

    expect(wallItemOf(row).wallOrder).toBeUndefined();
    expect(byWall(wallItemOf(row), { wallOrder: 3, date: '2020-01-01' })).toBeGreaterThan(0);
  });
});

describe('a story entry, written back', () => {
  const edit = (over: Partial<EntryEdit> = {}): EntryEdit => ({ ...entryEditOf(entry()), ...over });

  it('keeps what the editor has no field for', () => {
    // `kicker` is in the jsonb on some rows and in no control on the screen.
    // Rebuilding the object rather than merging into it would drop it, and the
    // reading pane would quietly lose a line nobody decided to remove.
    const current = { ...(entry().en as unknown as StoryCopy), kicker: ['Chapter one'] };

    expect(entryCopy(current, edit({ title: 'A new headline' }), 'en')).toMatchObject({
      title: 'A new headline',
      kicker: ['Chapter one'],
    });
  });

  it('splits the text back into paragraphs on a blank line', () => {
    const written = entryCopy(
      entry().en as unknown as StoryCopy,
      edit({ paras: 'One.\n\n  \n\nTwo.\n\nThree.' }),
      'en',
    );

    expect(written.paras).toEqual(['One.', 'Two.', 'Three.']);
  });

  it('stores a cleared eyebrow as absent rather than as an empty line', () => {
    // The card draws the eyebrow if it is there. An empty string is there.
    const written = entryCopy(entry().en as unknown as StoryCopy, edit({ eyebrow: '   ' }), 'en');

    expect(written.eyebrow).toBeNull();
  });

  it('writes the edition it was asked for and leaves the other alone', () => {
    const written = entryCopy(
      entry().ko as unknown as StoryCopy,
      edit({ title_ko: '이건 우리예요' }),
      'ko',
    );

    expect(written.title).toBe('이건 우리예요');
  });
});
