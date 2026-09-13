import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ChipGroup, { Chip, type ChipGroupProps } from './ChipGroup';
import SupabaseForm from './SupabaseForm';

/**
 * The row of pills, on its own.
 *
 * App.test.tsx walks the real story form and checks that its chip rows come
 * out as a radio group and a set of checkboxes. This is the same control
 * without a page around it, so what fails here points at the component rather
 * than at whatever happened to render it — and it can reach the parts a page
 * cannot show: an answer taken back, two rows writing to the same column, and
 * the two shapes (text and text[]) that the inputs themselves cannot carry to
 * the table.
 */

const { insert } = vi.hoisted(() => ({
  insert: vi.fn((_row: Record<string, unknown>) => Promise.resolve({ error: null })),
}));

// Stands in for the client, which is null in the test environment on purpose
// — the suite runs without keys. The form's own paths are not what is under
// test here; the row it builds out of the chips is.
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  STORY_MEDIA_BUCKET: 'story-media',
  supabase: { from: () => ({ insert }) },
}));

/** Step 2 of the story form: any number of these, or none. */
const FORMATS = ['Writing', 'Drawing', 'Photo', 'Video', 'Music', 'Dance', 'Craft', 'Recipe', 'Symbol'];

/** Step 1: one of these, or none. */
const DOORS = ['lived', 'noticed', 'imagined', 'were told', "can't say"];

/**
 * The chips carry the page's own inline style, as the generated pages do.
 * Several tests turn on that: the component has to tint a pill without
 * disturbing what the page already wrote on it.
 */
const PILL = {
  border: '1.5px solid rgba(46,59,64,0.3)',
  borderRadius: '999px',
  padding: '9px 16px',
  color: '#2E3B40',
  background: 'transparent',
};

function formatRow(props: Partial<ChipGroupProps> = {}) {
  return (
    <>
      <h2 id="format-q">Describe it first, then choose a form.</h2>
      <ChipGroup
        name="format"
        multi
        labelledBy="format-q"
        selBg="#FAB414"
        selFg="#2E3B40"
        selBorder="#2E3B40"
        {...props}
      >
        {FORMATS.map((format) => (
          <Chip key={format} value={format} style={PILL}>
            {format}
          </Chip>
        ))}
        {/* The pill says one thing and stores another. */}
        <Chip value="Yours" style={PILL}>
          {'…Yours'}
        </Chip>
      </ChipGroup>
    </>
  );
}

function doorRow(props: Partial<ChipGroupProps> = {}) {
  return (
    <>
      <p id="door-q">Good. Only so we can place it well — this one is something you…</p>
      <ChipGroup name="door" labelledBy="door-q" {...props}>
        {DOORS.map((door) => (
          <Chip key={door} value={door} style={PILL}>
            {door}
          </Chip>
        ))}
      </ChipGroup>
    </>
  );
}

describe('a single-select row', () => {
  it('is a radio group named by the question above it', () => {
    render(doorRow());

    const group = screen.getByRole('radiogroup', { name: /this one is something you/ });
    expect(within(group).getAllByRole('radio')).toHaveLength(DOORS.length);
    // The column it writes to is not what it is called.
    expect(group).not.toHaveAccessibleName('door');
  });

  it('takes a name of its own where the page has no visible question', () => {
    render(doorRow({ labelledBy: undefined, label: 'How the story reached you' }));

    expect(screen.getByRole('radiogroup', { name: 'How the story reached you' })).toBeInTheDocument();
  });

  it('holds one answer at a time', () => {
    render(doorRow());
    const lived = screen.getByRole('radio', { name: 'lived' });
    const noticed = screen.getByRole('radio', { name: 'noticed' });

    fireEvent.click(lived);
    expect(lived).toBeChecked();

    fireEvent.click(noticed);
    expect(noticed).toBeChecked();
    expect(lived).not.toBeChecked();
  });

  it('gives the answer back when you choose it a second time', () => {
    // A radio cannot be unchecked by clicking it and fires no change event
    // when it is already checked — but these answers are optional, so the
    // component listens for the click as well.
    render(doorRow());
    const lived = screen.getByRole('radio', { name: 'lived' });

    fireEvent.click(lived);
    expect(lived).toBeChecked();
    fireEvent.click(lived);
    expect(lived).not.toBeChecked();
  });
});

describe('the multi-select row', () => {
  it('is a set of checkboxes rather than a radio group', () => {
    render(formatRow());

    const group = screen.getByRole('group', { name: 'Describe it first, then choose a form.' });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(FORMATS.length + 1);
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('keeps every answer chosen, and lets one go without disturbing the rest', () => {
    render(formatRow());
    const photo = screen.getByRole('checkbox', { name: 'Photo' });
    const music = screen.getByRole('checkbox', { name: 'Music' });
    const dance = screen.getByRole('checkbox', { name: 'Dance' });

    for (const chip of [photo, music, dance]) fireEvent.click(chip);
    expect(photo).toBeChecked();
    expect(music).toBeChecked();
    expect(dance).toBeChecked();

    fireEvent.click(music);
    expect(music).not.toBeChecked();
    expect(photo).toBeChecked();
    expect(dance).toBeChecked();
  });

  it('stores the value, not the word on the pill', () => {
    render(formatRow());

    expect(screen.getByRole('checkbox', { name: '…Yours' })).toHaveAttribute('value', 'Yours');
  });
});

describe('the names on the inputs', () => {
  it('groups a row under one name, and keeps that name out of the columns', () => {
    render(formatRow());

    // One name for the whole row is what groups it for the keyboard…
    const names = new Set(screen.getAllByRole('checkbox').map((chip) => chip.getAttribute('name')));
    expect(names.size).toBe(1);
    // …and the prefix is what stops SupabaseForm reading that name as a column.
    expect([...names][0]).toMatch(/^chip:format/);
  });

  it('does not join two rows that write to the same column', () => {
    render(
      <>
        <ChipGroup name="door" label="The first telling">
          <Chip value="lived">lived</Chip>
          <Chip value="noticed">noticed</Chip>
        </ChipGroup>
        <ChipGroup name="door" label="The second telling">
          <Chip value="lived">lived</Chip>
          <Chip value="noticed">noticed</Chip>
        </ChipGroup>
      </>,
    );

    const first = within(screen.getByRole('radiogroup', { name: 'The first telling' }));
    const second = within(screen.getByRole('radiogroup', { name: 'The second telling' }));

    fireEvent.click(first.getByRole('radio', { name: 'lived' }));
    fireEvent.click(second.getByRole('radio', { name: 'noticed' }));

    // Radios sharing a name are one group to the browser, so an id of its own
    // per row is what keeps the second answer from clearing the first.
    expect(first.getByRole('radio', { name: 'lived' })).toBeChecked();
    expect(second.getByRole('radio', { name: 'noticed' })).toBeChecked();
  });
});

describe('the pill', () => {
  const pillOf = (chip: HTMLElement) => chip.closest('label') as HTMLLabelElement;

  it('paints the chosen chip in the colours the page asked for', () => {
    render(formatRow());
    const writing = screen.getByRole('checkbox', { name: 'Writing' });

    expect(pillOf(writing)).not.toHaveAttribute('data-selected');
    fireEvent.click(writing);

    // The attribute is the stylesheet's hook for the border colour; the fill
    // and the ink are set here, over the two property names the page's own
    // style uses, so each is replaced rather than spelled twice.
    expect(pillOf(writing)).toHaveAttribute('data-selected');
    expect(pillOf(writing)).toHaveStyle({ background: '#FAB414', color: '#2E3B40' });
  });

  it('hands the border colour down to the stylesheet as a custom property', () => {
    render(formatRow());

    // The one colour of the three that is not set inline — see ChipGroup.css.
    const group = screen.getByRole('group', { name: /choose a form/ });
    expect(group.style.getPropertyValue('--chip-border')).toBe('#2E3B40');
  });

  it('takes nothing with it when the chip is released', () => {
    // This is the test for the bug the custom property above exists to avoid:
    // a `borderColor` longhand written over the page's `border` shorthand
    // cannot be taken off again, so the pill kept the last selection's colour
    // after it was deselected. Comparing the whole inline style rather than
    // one property is what makes that visible whichever property leaks.
    render(formatRow());
    const writing = screen.getByRole('checkbox', { name: 'Writing' });
    const before = pillOf(writing).getAttribute('style');

    fireEvent.click(writing);
    expect(pillOf(writing).getAttribute('style')).not.toBe(before);

    fireEvent.click(writing);
    expect(pillOf(writing)).not.toHaveAttribute('data-selected');
    expect(pillOf(writing).getAttribute('style')).toBe(before);
  });

  it('leaves anything in the row that is not a chip alone', () => {
    render(
      <ChipGroup name="door" label="Doors">
        <Chip value="lived">lived</Chip>
        <span>or</span>
        {'say nothing'}
      </ChipGroup>,
    );

    expect(screen.getByText('or')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toHaveTextContent('say nothing');
  });
});

describe('inside a form', () => {
  const submitted = () => insert.mock.calls[0][0];

  it('writes one row as text and the other as an array', async () => {
    insert.mockClear();
    render(
      <SupabaseForm table="stories">
        {doorRow()}
        {formatRow()}
        <button type="submit">Send</button>
      </SupabaseForm>,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'noticed' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Photo' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '…Yours' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Thank you — that reached us.')).toBeInTheDocument();
    expect(submitted().door).toBe('noticed');
    expect(submitted().format).toEqual(['Photo', 'Yours']);
    // The values arrive through the context, and the twenty-odd inputs that
    // carried them on screen leave nothing of their own behind: two columns
    // and the page the form was on, and nothing named after a control.
    expect(Object.keys(submitted()).sort()).toEqual(['door', 'format', 'source_page']);
  });

  it('sends an empty answer for a row nobody touched', async () => {
    insert.mockClear();
    render(
      <SupabaseForm table="stories">
        {doorRow()}
        {formatRow()}
        <button type="submit">Send</button>
      </SupabaseForm>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Thank you — that reached us.')).toBeInTheDocument();
    // Both columns are optional: `door` is nullable and `format` defaults to
    // an empty array, so this is the shape the table already expects.
    expect(submitted().door).toBeNull();
    expect(submitted().format).toEqual([]);
  });
});
