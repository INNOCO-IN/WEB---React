import { describe, expect, it } from 'vitest';
import { EDITIONS, editionOf, isPreSlug, workshopName } from '../lib/services/review';
import { LOCALES } from '../i18n/locales';
import type { RegistrationRow, StoryRow, SubmissionRow } from '../lib/services/review';
import { DESK_COPY } from './copy';
import {
  NO_FILTERS,
  applyFilters,
  chipsFor,
  clearAll,
  clearChip,
  facetsFor,
  group,
  toDeskRow,
  years,
  type DeskFilters,
} from './filters';

/**
 * The desk's rules, tested without a browser or a database.
 *
 * These are the parts where being wrong is quiet: a row that no filter reaches,
 * an edition tag that sends a reply back in the wrong language, a search that
 * reads the page on screen rather than the whole queue. None of them throw.
 */

const TODAY = '2026-09-14';

function story(over: Partial<StoryRow> = {}): StoryRow {
  return {
    id: 'story-1',
    body: 'We were folding chairs after the session and nobody left.',
    consent: true,
    created_at: '2026-09-11T09:00:00Z',
    credit_name: 'Areum J.',
    door: 'lived',
    email: 'areum@example.org',
    format: ['writing', 'photo'],
    arc_stage: 'ME + WE',
    attachment_url: null,
    media: null,
    published_as: null,
    source_page: '/story/submit',
    status: 'pending',
    ...over,
  };
}

function enquiry(over: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    id: 'enq-1',
    brings: 'workshop-for-org',
    created_at: '2026-09-12T09:00:00Z',
    email: 'mira@thirdplace.coop',
    message: 'We run a co-op of about sixty members in Kathmandu.',
    name: 'Mira Sen',
    source_page: '/are-you-in',
    status: 'new',
    ...over,
  };
}

function signup(over: Partial<RegistrationRow> = {}): RegistrationRow {
  return {
    id: 'reg-1',
    created_at: '2026-09-13T09:00:00Z',
    email: 'seoyeon@example.org',
    message: null,
    name: 'Seo-yeon Lim',
    org: 'Dongdaemun Youth Centre',
    source_page: '/workshop/mobius-making',
    status: 'new',
    workshop_id: null,
    workshop_slug: 'mobius-making',
    ...over,
  };
}

const filters = (over: Partial<DeskFilters> = {}): DeskFilters => ({ ...NO_FILTERS, ...over });

const EN = DESK_COPY.en;
const KO = DESK_COPY.ko;
const ZH = DESK_COPY['zh-TW'];

describe('editionOf', () => {
  it('reads the edition off the path the row came from', () => {
    expect(editionOf('/are-you-in')).toBe('en');
    expect(editionOf('/ko/are-you-in')).toBe('ko');
    expect(editionOf('/zh-tw/are-you-in')).toBe('zh-TW');
  });

  it('reads an absent path as English, which is what an unprefixed path means', () => {
    expect(editionOf(null)).toBe('en');
    expect(editionOf('')).toBe('en');
  });

  // `/korean-workshops` starts with the letters but is not the prefix. Matching
  // loosely here would tag an English row Korean and send the reply back in the
  // wrong language, which is the one job this field has.
  it('does not mistake a path that merely begins with a locale word', () => {
    expect(editionOf('/korean-stories')).toBe('en');
    expect(editionOf('/koala')).toBe('en');
  });
});

describe('EDITIONS', () => {
  it('leads with the two the design board itself listed', () => {
    expect(EDITIONS.slice(0, 2)).toEqual(['en', 'ko']);
  });

  // The failure this guards is quiet: a language added to the site but missing
  // from the filter leaves rows tagged with an edition no control can select.
  it('carries every language the site speaks, exactly once', () => {
    expect([...EDITIONS].sort()).toEqual([...LOCALES].sort());
    expect(new Set(EDITIONS).size).toBe(EDITIONS.length);
  });
});

describe('toDeskRow', () => {
  it('marks the head of each queue as waiting and everything else as handled', () => {
    expect(toDeskRow('stories', story({ status: 'pending' })).waiting).toBe(true);
    expect(toDeskRow('stories', story({ status: 'published' })).waiting).toBe(false);
    expect(toDeskRow('submissions', enquiry({ status: 'new' })).waiting).toBe(true);
    expect(toDeskRow('submissions', enquiry({ status: 'archived' })).waiting).toBe(false);
  });

  // Both editions are indexed, because which one a reviewer was shown depends
  // on the language the desk was in when they read it.
  it('searches the sentence the desk shows, not only the slug it stores', () => {
    const row = toDeskRow('submissions', enquiry());
    expect(row.haystack).toContain('workshop-for-org');
    expect(row.haystack).toContain('wants a workshop for their organisation');
    expect(row.haystack).toContain('조직에 워크숍을 열고 싶어함');
    expect(row.haystack).toContain('想在自己的組織辦工作坊');
  });

  it('searches the workshop name as well as its slug', () => {
    const row = toDeskRow('workshop_registrations', signup());
    expect(row.haystack).toContain('mobius-making');
    expect(row.haystack).toContain('möbius making');
  });
});

describe('applyFilters', () => {
  const rows = [
    toDeskRow('stories', story({ id: 'a', created_at: '2026-09-11T09:00:00Z' })),
    toDeskRow('stories', story({ id: 'b', created_at: '2026-01-02T09:00:00Z', door: 'noticed', format: ['writing'] })),
    toDeskRow('stories', story({ id: 'c', created_at: '2025-08-01T09:00:00Z', source_page: '/ko/story/submit' })),
  ];

  it('leaves the queue whole when no filter is on', () => {
    expect(applyFilters(rows, filters(), TODAY)).toHaveLength(3);
  });

  it('orders newest first by default, and oldest first on request', () => {
    expect(applyFilters(rows, filters(), TODAY).map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(applyFilters(rows, filters({ order: 'oldest' }), TODAY).map((row) => row.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not reorder the array it was given', () => {
    const before = rows.map((row) => row.id);
    applyFilters(rows, filters({ order: 'oldest' }), TODAY);
    expect(rows.map((row) => row.id)).toEqual(before);
  });

  it('narrows by the edition a row was written in', () => {
    expect(applyFilters(rows, filters({ language: 'ko' }), TODAY).map((row) => row.id)).toEqual(['c']);
    expect(applyFilters(rows, filters({ language: 'en' }), TODAY)).toHaveLength(2);
  });

  it('narrows by arrival', () => {
    expect(applyFilters(rows, filters({ arrived: '30d' }), TODAY).map((row) => row.id)).toEqual(['a']);
    expect(applyFilters(rows, filters({ arrived: 'year' }), TODAY).map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('treats a half-typed date range as half-bounded rather than as no range', () => {
    const from = applyFilters(rows, filters({ arrived: 'range', from: '2026-01-01' }), TODAY);
    expect(from.map((row) => row.id)).toEqual(['a', 'b']);

    const to = applyFilters(rows, filters({ arrived: 'range', to: '2026-01-31' }), TODAY);
    expect(to.map((row) => row.id)).toEqual(['b', 'c']);
  });

  // The form offers a multi-select and the index colours by one format. A row
  // that ticked Writing and Photo has to answer to both, not only to the first.
  it('matches any format the submitter ticked, not just the one the index uses', () => {
    expect(applyFilters(rows, filters({ facet: { format: 'photo' } }), TODAY).map((row) => row.id)).toEqual(['a', 'c']);
    expect(applyFilters(rows, filters({ facet: { format: 'writing' } }), TODAY)).toHaveLength(3);
  });

  it('composes every control at once', () => {
    const result = applyFilters(
      rows,
      filters({ facet: { door: 'lived' }, language: 'en', arrived: 'year' }),
      TODAY,
    );
    expect(result.map((row) => row.id)).toEqual(['a']);
  });

  it('searches case-insensitively across the fields the form collected', () => {
    expect(applyFilters(rows, filters({ search: 'KATHMANDU' }), TODAY)).toHaveLength(0);
    expect(applyFilters(rows, filters({ search: 'Folding Chairs' }), TODAY)).toHaveLength(3);
  });

  it('ignores an empty facet value rather than matching rows with no value', () => {
    expect(applyFilters(rows, filters({ facet: { door: '' } }), TODAY)).toHaveLength(3);
  });
});

describe('group', () => {
  it('splits waiting from handled and keeps the order within each', () => {
    const rows = [
      toDeskRow('stories', story({ id: 'a', status: 'pending' })),
      toDeskRow('stories', story({ id: 'b', status: 'published' })),
      toDeskRow('stories', story({ id: 'c', status: 'pending' })),
    ];
    const { waiting, handled } = group(rows);
    expect(waiting.map((row) => row.id)).toEqual(['a', 'c']);
    expect(handled.map((row) => row.id)).toEqual(['b']);
  });
});

describe('years', () => {
  it('counts the years present, newest first', () => {
    const rows = [
      toDeskRow('stories', story({ id: 'a', created_at: '2026-09-11T09:00:00Z' })),
      toDeskRow('stories', story({ id: 'b', created_at: '2026-01-02T09:00:00Z' })),
      toDeskRow('stories', story({ id: 'c', created_at: '2024-08-01T09:00:00Z' })),
    ];
    expect(years(rows)).toEqual([
      { year: '2026', count: 2 },
      { year: '2024', count: 1 },
    ]);
  });
});

describe('chips', () => {
  it('names every narrowing that is on, and nothing that is not', () => {
    expect(chipsFor(filters(), EN)).toEqual([]);

    const labels = chipsFor(
      filters({ search: 'kathmandu', facet: { door: 'lived' }, arrived: 'year', language: 'ko' }),
      EN,
    ).map((chip) => chip.label);

    expect(labels).toEqual(['“kathmandu”', 'Door · lived', 'Arrived · this year', 'Language · KO']);
  });

  it('shows a brings chip as the sentence the desk renders', () => {
    const [chip] = chipsFor(filters({ facet: { brings: 'workshop-for-org' } }), EN);
    expect(chip.label).toBe('Brings · Wants a workshop for their organisation');
  });

  // The slug is stored without a language so the desk can render it in
  // whichever one it is being read in. The row's own words never move.
  it('renders the same stored slug in the language the desk is in', () => {
    const [ko] = chipsFor(filters({ facet: { brings: 'workshop-for-org' } }), KO);
    expect(ko.label).toBe('Brings · 조직에 워크숍을 열고 싶어함');

    const [zh] = chipsFor(filters({ facet: { brings: 'workshop-for-org' } }), ZH);
    expect(zh.label).toBe('Brings · 想在自己的組織辦工作坊');
  });

  it('clears one narrowing without touching the others', () => {
    const on = filters({ search: 'x', facet: { door: 'lived' }, language: 'ko' });
    const after = clearChip(on, 'facet:door');
    expect(after.facet.door).toBeUndefined();
    expect(after.search).toBe('x');
    expect(after.language).toBe('ko');
  });

  it('clears the dates with the arrived chip, so no bound is left behind', () => {
    const on = filters({ arrived: 'range', from: '2024-01-01', to: '2024-12-31' });
    expect(clearChip(on, 'arrived')).toMatchObject({ arrived: 'any', from: '', to: '' });
  });

  // Order is a view rather than a narrowing: clearing the filters should not
  // also flip the queue back to newest-first under the reader.
  it('keeps the order when everything else is cleared', () => {
    const on = filters({ search: 'x', order: 'oldest', language: 'ko' });
    expect(clearAll(on)).toEqual({ ...NO_FILTERS, order: 'oldest' });
  });
});

describe('facetsFor', () => {
  it('names the queue-specific select in the language the desk is in', () => {
    expect(facetsFor('submissions', [], [], EN)[0].label).toBe('What brings them');
    expect(facetsFor('submissions', [], [], KO)[0].label).toBe('무엇 때문에 연락했나요');
    expect(facetsFor('submissions', [], [], ZH)[0].label).toBe('為什麼來信');
  });

  it('offers stories three selects, and the other queues one', () => {
    expect(facetsFor('stories', [], ['writing'], EN).map((facet) => facet.key)).toEqual(['door', 'format', 'arc']);
    expect(facetsFor('submissions', [], [], EN).map((facet) => facet.key)).toEqual(['brings']);
    expect(facetsFor('workshop_registrations', [], [], EN).map((facet) => facet.key)).toEqual(['workshop']);
  });

  it('lists a fixed vocabulary in full, so a select does not move under the hand', () => {
    const [door] = facetsFor('stories', [], [], EN);
    expect(door.options.map((option) => option.value)).toEqual([
      'lived',
      'noticed',
      'imagined',
      'were told',
      "can't say",
    ]);
  });

  // A pre-slug sentence is permanent. Leaving it out of the filter would leave
  // rows in the queue that no narrowing can reach.
  it('adds the pre-slug sentences a queue actually holds to the brings filter', () => {
    const rows = [toDeskRow('submissions', enquiry({ brings: 'Proposing something we could build together' }))];
    const [brings] = facetsFor('submissions', rows, [], EN);

    expect(brings.options).toHaveLength(7);
    expect(brings.options.at(-1)).toEqual({
      value: 'Proposing something we could build together',
      label: '“Proposing something we could build together”',
    });
  });

  it('counts the workshops a queue names, because sign-ups arrive in clusters', () => {
    const rows = [
      toDeskRow('workshop_registrations', signup({ id: '1' })),
      toDeskRow('workshop_registrations', signup({ id: '2' })),
      toDeskRow('workshop_registrations', signup({ id: '3', workshop_slug: 'pathfinder' })),
    ];
    const [workshop] = facetsFor('workshop_registrations', rows, [], EN);

    expect(workshop.options).toEqual([
      { value: 'mobius-making', label: 'Möbius Making', count: 2 },
      { value: 'pathfinder', label: 'Pathfinder', count: 1 },
    ]);
  });
});

describe('the pre-slug row', () => {
  it('tells one of the six slugs apart from a sentence somebody was given', () => {
    expect(isPreSlug('workshop-curious')).toBe(false);
    expect(isPreSlug('Proposing something we could build together')).toBe(true);
    expect(isPreSlug('워크숍이 궁금합니다')).toBe(true);
    expect(isPreSlug(null)).toBe(false);
    expect(isPreSlug('')).toBe(false);
  });
});

describe('workshopName', () => {
  it('shows a known slug as its name and an unknown one as the slug', () => {
    expect(workshopName('mobius-making')).toBe('Möbius Making');
    expect(workshopName('not-a-workshop')).toBe('not-a-workshop');
    expect(workshopName(null)).toBe('');
  });
});
