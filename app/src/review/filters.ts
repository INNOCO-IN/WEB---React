import type { Locale } from '../i18n/locales';
import type { DeskCopy } from './copy';
import {
  BRINGS,
  INBOX,
  editionOf,
  isPreSlug,
  workshopName,
  type IntakeRow,
  type IntakeTable,
  type RegistrationRow,
  type StoryRow,
  type SubmissionRow,
} from '../lib/services/review';

/**
 * Narrowing a queue down to the row somebody is looking for.
 *
 * All of it is client-side and pure, which is a decision about volume rather
 * than about architecture: a handful of rows a week and a few hundred a year
 * means the whole table is already in memory, and a round trip per keystroke
 * would buy nothing. The one thing that must stay true as it grows is that
 * every control reads the *whole* queue and not the page on screen — finding
 * the enquiry from the co-op in Kathmandu cannot depend on how far somebody has
 * scrolled. Paging is therefore applied last, to the result, and never to the
 * input.
 *
 * Pure on purpose: this is the half of the desk with rules in it, so it is the
 * half worth testing without a browser or a database.
 */

/** A row of any of the three queues, in the terms the filters work in. */
export interface DeskRow {
  id: string;
  table: IntakeTable;
  status: string;
  /** ISO timestamp, as the row carries it. */
  createdAt: string;
  /** `2026-09-11` — what the rail prints and what the date filters compare. */
  day: string;
  /** The edition the row was written in, derived from its source path. */
  edition: Locale;
  sourcePage: string | null;
  /** Lowercased text of every field the search box reads. */
  haystack: string;
  /** The queue-specific facets its filter bar offers. */
  facets: { door?: string; format?: string[]; arc?: string; brings?: string; workshop?: string };
  /** True when this row is still waiting to be decided. */
  waiting: boolean;
  row: IntakeRow;
}

export type Arrived = 'any' | '30d' | 'year' | 'range';
export type Order = 'newest' | 'oldest';

export interface DeskFilters {
  search: string;
  /** Facet key → the chosen value. An absent or empty value means "any". */
  facet: Record<string, string>;
  arrived: Arrived;
  /** Both ISO days, used only while `arrived` is `range`. */
  from: string;
  to: string;
  language: 'any' | Locale;
  order: Order;
}

export const NO_FILTERS: DeskFilters = {
  search: '',
  facet: {},
  arrived: 'any',
  from: '',
  to: '',
  language: 'any',
  order: 'newest',
};

/* --------------------------------------------------------------- normalise */

const text = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' ').toLowerCase();

/**
 * One table's row in the terms the filters work in.
 *
 * The search haystack is built here rather than at match time so that a
 * keystroke does not re-read every field of every row, and so that what "search
 * this queue" covers is one visible list per table rather than a condition
 * spread through the matcher.
 */
export function toDeskRow(table: IntakeTable, row: IntakeRow): DeskRow {
  const createdAt = String((row as { created_at?: string }).created_at ?? '');
  const status = String((row as { status?: string }).status ?? '');
  const sourcePage = (row as { source_page?: string | null }).source_page ?? null;

  const common = {
    id: String((row as { id?: string }).id ?? ''),
    table,
    status,
    createdAt,
    day: createdAt.slice(0, 10),
    edition: editionOf(sourcePage),
    sourcePage,
    waiting: status === INBOX[table],
    row,
  };

  if (table === 'stories') {
    const story = row as StoryRow;
    return {
      ...common,
      haystack: text(story.body, story.credit_name, story.email, story.door, story.arc_stage, ...(story.format ?? [])),
      facets: {
        door: story.door ?? undefined,
        format: story.format ?? undefined,
        arc: story.arc_stage ?? undefined,
      },
    };
  }

  if (table === 'submissions') {
    const enquiry = row as SubmissionRow;
    // The rendered sentence is searched as well as the slug: somebody looking
    // for "workshop for their organisation" typed what the desk showed them,
    // not what the column holds. Every language is indexed, because which one
    // they were shown depends on the language the desk was in — and read off
    // `BRINGS` rather than named here, so adding a language cannot quietly
    // leave its sentences unsearchable.
    const brings = enquiry.brings ?? undefined;
    const rendered = brings ? Object.values(BRINGS).map((table) => table[brings]) : [];

    return {
      ...common,
      haystack: text(enquiry.name, enquiry.email, enquiry.message, brings, ...rendered),
      facets: { brings },
    };
  }

  const signup = row as RegistrationRow;
  const slug = signup.workshop_slug ?? undefined;
  return {
    ...common,
    haystack: text(signup.name, signup.email, signup.org, signup.message, slug, slug ? workshopName(slug) : null),
    facets: { workshop: slug },
  };
}

/* ------------------------------------------------------------------ match */

/** The ISO day `days` before `today`. */
function daysBefore(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function inDateRange(row: DeskRow, filters: DeskFilters, today: string): boolean {
  if (!row.day) return filters.arrived === 'any';

  switch (filters.arrived) {
    case '30d':
      return row.day >= daysBefore(today, 30);
    case 'year':
      return row.day.slice(0, 4) === today.slice(0, 4);
    case 'range':
      // An open end is a half-bounded range rather than no range: somebody who
      // has typed only "from" means everything since, and is mid-typing rather
      // than mistaken.
      if (filters.from && row.day < filters.from) return false;
      if (filters.to && row.day > filters.to) return false;
      return true;
    default:
      return true;
  }
}

function matchesFacets(row: DeskRow, filters: DeskFilters): boolean {
  for (const [key, wanted] of Object.entries(filters.facet)) {
    if (!wanted) continue;
    const held = row.facets[key as keyof DeskRow['facets']];

    // `format` is the multi-select the story form offers, so the row matches if
    // the chosen format is any of the ones ticked — not only the first, which
    // is the one the index happens to colour by.
    if (Array.isArray(held)) {
      if (!held.includes(wanted)) return false;
      continue;
    }
    if ((held ?? '') !== wanted) return false;
  }
  return true;
}

/**
 * The queue, narrowed and ordered.
 *
 * Every control composes, and Order applies last. `today` is passed in rather
 * than read from the clock so that "this year" is a function of its arguments
 * and can be tested.
 */
export function applyFilters(rows: DeskRow[], filters: DeskFilters, today: string): DeskRow[] {
  const needle = filters.search.trim().toLowerCase();

  const kept = rows.filter((row) => {
    if (needle && !row.haystack.includes(needle)) return false;
    if (filters.language !== 'any' && row.edition !== filters.language) return false;
    if (!matchesFacets(row, filters)) return false;
    return inDateRange(row, filters, today);
  });

  // Sorted on a copy: the caller's array is the fetched queue, and reordering
  // it in place would make the grouping below depend on which filter ran last.
  return [...kept].sort((a, b) =>
    filters.order === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
  );
}

/**
 * Waiting and handled, in that order.
 *
 * The status view *is* the grouping, which is why there is no status filter in
 * the bar: a fifth control would only restate the two headings.
 */
export function group(rows: DeskRow[]): { waiting: DeskRow[]; handled: DeskRow[] } {
  return {
    waiting: rows.filter((row) => row.waiting),
    handled: rows.filter((row) => !row.waiting),
  };
}

/** How many handled rows arrive at a time. Waiting is never paged. */
export const HANDLED_PAGE = 25;

/** The years present in a run of rows, newest first, with their counts. */
export function years(rows: DeskRow[]): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const year = row.day.slice(0, 4);
    if (year) counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

/* ------------------------------------------------------------------ chips */

export interface Chip {
  /** What to clear: a facet key, or one of the standing controls. */
  key: string;
  label: string;
}

const FACET_LABEL: Record<string, string> = {
  door: 'Door',
  format: 'Format',
  arc: 'Arc',
  brings: 'Brings',
  workshop: 'Workshop',
};

/**
 * The filters currently on, as removable chips.
 *
 * Shown because a filter left on quietly is the reason a row goes unread — the
 * desk would rather say "you are looking at 7 of 340" than let somebody
 * conclude the queue is empty.
 */
export function chipsFor(filters: DeskFilters, copy: DeskCopy): Chip[] {
  const chips: Chip[] = [];

  if (filters.search.trim()) chips.push({ key: 'search', label: `“${filters.search.trim()}”` });

  for (const [key, value] of Object.entries(filters.facet)) {
    if (!value) continue;
    const shown =
      key === 'workshop'
        ? workshopName(value)
        : key === 'brings'
          ? (BRINGS[copy.locale][value] ?? value)
          : value;
    chips.push({ key: `facet:${key}`, label: `${FACET_LABEL[key] ?? key} · ${shown}` });
  }

  if (filters.arrived === '30d') chips.push({ key: 'arrived', label: 'Arrived · 30 days' });
  if (filters.arrived === 'year') chips.push({ key: 'arrived', label: 'Arrived · this year' });
  if (filters.arrived === 'range' && (filters.from || filters.to)) {
    chips.push({ key: 'arrived', label: `Arrived · ${filters.from || '…'} to ${filters.to || '…'}` });
  }

  if (filters.language !== 'any') chips.push({ key: 'language', label: `Language · ${filters.language.toUpperCase()}` });

  return chips;
}

/** Clears one chip, returning the filters without it. */
export function clearChip(filters: DeskFilters, key: string): DeskFilters {
  if (key === 'search') return { ...filters, search: '' };
  if (key === 'arrived') return { ...filters, arrived: 'any', from: '', to: '' };
  if (key === 'language') return { ...filters, language: 'any' };

  if (key.startsWith('facet:')) {
    const facet = { ...filters.facet };
    delete facet[key.slice('facet:'.length)];
    return { ...filters, facet };
  }
  return filters;
}

/** Clears everything but the order, which is a view rather than a narrowing. */
export function clearAll(filters: DeskFilters): DeskFilters {
  return { ...NO_FILTERS, order: filters.order };
}

/* ------------------------------------------------------ what a queue offers */

export interface Facet {
  key: string;
  label: string;
  /** The "no filter" entry, which is not a value. */
  any: string;
  options: { value: string; label: string; count?: number }[];
}

const DOORS = ['lived', 'noticed', 'imagined', 'were told', "can't say"];
const ARCS = ['IGNITE', 'ME ≠ WE', 'ME + WE', '(ME WE)', 'ME = WE', 'GLOW', 'Let IN place it'];

/**
 * The selects one queue's filter bar carries.
 *
 * Stories offer three because the submission form collects three; the other two
 * queues offer the one field that varies. Where the vocabulary is fixed it is
 * listed in full — a door with nothing in it this month is still a door, and a
 * select whose options come and go with the data is a select that moves under
 * the hand. The workshop filter is the exception, and counts its options,
 * because sign-ups arrive in clusters and "Möbius Making · 9" is the fact a
 * reviewer opens the queue for.
 */
export function facetsFor(
  table: IntakeTable,
  rows: DeskRow[],
  formats: string[],
  copy: DeskCopy,
): Facet[] {
  if (table === 'stories') {
    return [
      {
        key: 'door',
        label: copy.door,
        any: copy.anyDoor,
        options: DOORS.map((value) => ({ value, label: value })),
      },
      {
        key: 'format',
        label: copy.format,
        any: copy.anyFormat,
        options: formats.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
      },
      {
        key: 'arc',
        label: copy.arc,
        any: copy.anyArc,
        options: ARCS.map((value) => ({ value, label: value })),
      },
    ];
  }

  if (table === 'submissions') {
    // The six slugs, plus however many pre-slug sentences this queue holds.
    // Those rows are permanent, so leaving them out of the filter would leave
    // rows that no narrowing can reach.
    const legacy = [...new Set(rows.map((row) => row.facets.brings).filter((value): value is string => isPreSlug(value)))];

    return [
      {
        key: 'brings',
        label: copy.brings,
        any: copy.anyBrings,
        options: [
          ...Object.entries(BRINGS[copy.locale]).map(([value, label]) => ({ value, label })),
          ...legacy.map((value) => ({ value, label: `“${value}”` })),
        ],
      },
    ];
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    const slug = row.facets.workshop;
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return [
    {
      key: 'workshop',
      label: copy.workshop,
      any: copy.anyWorkshop,
      options: [...counts.entries()]
        .map(([value, count]) => ({ value, label: workshopName(value), count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
  ];
}
