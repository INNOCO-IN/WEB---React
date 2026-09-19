import { describe, expect, it } from 'vitest';
import { whyNot } from '../lib/services/review';
import {
  buildEntry,
  buildPoint,
  composeEntry,
  copyOf,
  pointOf,
  type NewStory,
  type StorySubmission,
} from '../lib/story-promotion';

/**
 * Writing a story nobody sent, tested without a screen or a database.
 *
 * Two things are being pinned here. The first is the new road into the
 * collection: what the desk refuses to write, and what it fills in when a field
 * is left empty. The second is the old one — `buildEntry` was rewritten to go
 * through the same builder, and a submission must still become exactly the row
 * it became before, because that road already published everything on the site.
 */

const good: NewStory = {
  slug: 'the-chairs-moved',
  title: 'The chairs moved themselves',
  topic: 'noticed',
  format: 'writing',
  date: '2026-09-19',
  body: 'We were folding chairs after the session.\n\nNobody left.',
};

describe('what the desk refuses to write', () => {
  it('takes a story with a permalink, a headline, a day and something to say', () => {
    expect(whyNot(good)).toBeNull();
  });

  it('refuses a story with no permalink — it is the address the site links to', () => {
    expect(whyNot({ ...good, slug: '' })).toMatch(/permalink/);
  });

  it('refuses a permalink that is not a slug, rather than quietly fixing it', () => {
    // Quietly fixing it would mean the address somebody typed and the address
    // the story ends up at are two different strings.
    expect(whyNot({ ...good, slug: 'The Chairs Moved' })).toMatch(/lowercase/);
  });

  it('refuses a story with no English headline', () => {
    expect(whyNot({ ...good, title: '   ' })).toMatch(/title/);
  });

  it('refuses a date that is not a day', () => {
    expect(whyNot({ ...good, date: 'September' })).toMatch(/YYYY-MM-DD/);
  });

  it('refuses a topic or a format the taxonomy has never heard of', () => {
    expect(whyNot({ ...good, topic: 'gossip' })).toMatch(/topics/);
    expect(whyNot({ ...good, format: 'interpretive-dance' })).toMatch(/formats/);
  });

  it('refuses a story with neither a blurb nor a body', () => {
    expect(whyNot({ ...good, body: '', blurb: '' })).toMatch(/blurb or a body/);
  });

  it('takes a story that has only a blurb, which is what a one-line card is', () => {
    expect(whyNot({ ...good, body: '', blurb: 'Three honest sentences is a story.' })).toBeNull();
  });
});

describe('the row it writes', () => {
  it('falls back to the first paragraph when no blurb is given', () => {
    expect(copyOf(composeEntry(good).en).body).toBe('We were folding chairs after the session.');
  });

  it('treats a blurb left empty on a form as no blurb at all', () => {
    // A form hands back '' where code hands back undefined, and `??` does not
    // catch the first — which wrote a card with a hole in it.
    expect(copyOf(composeEntry({ ...good, blurb: '   ' }).en).body).toBe(
      'We were folding chairs after the session.',
    );
  });

  it('stores an empty picture and plate as absent, not as empty strings', () => {
    const entry = composeEntry({ ...good, image: '', color: '' });

    expect(entry.image).toBeNull();
    expect(entry.color).toBeNull();
  });

  it('splits the body into paragraphs on a blank line', () => {
    expect(copyOf(composeEntry(good).en).paras).toEqual([
      'We were folding chairs after the session.',
      'Nobody left.',
    ]);
  });

  it('carries the English across when the Korean is not given, field by field', () => {
    const entry = composeEntry(good);

    expect(copyOf(entry.ko).title).toBe('The chairs moved themselves');
    expect(copyOf(entry.ko).paras).toEqual(copyOf(entry.en).paras);
  });

  it('keeps the Korean that is given, and only that', () => {
    const entry = composeEntry({ ...good, koTitle: '의자가 스스로 움직였다' });

    expect(copyOf(entry.ko).title).toBe('의자가 스스로 움직였다');
    // The blurb was not translated, so it is still the English one rather than
    // an empty line on the Korean page.
    expect(copyOf(entry.ko).body).toBe(copyOf(entry.en).body);
  });

  it('stores an empty eyebrow and credit as absent rather than as empty strings', () => {
    const entry = composeEntry({ ...good, eyebrow: '  ', credit: '' });

    expect(copyOf(entry.en).eyebrow).toBeNull();
    expect(copyOf(entry.en).credit).toBeNull();
  });

  it('states the columns a story is born with, rather than leaving them to default', () => {
    // Writing an entry is an upsert: a story that was declined and is being
    // published again is the same row, and that row is hidden.
    expect(composeEntry(good)).toMatchObject({ draft: false, hidden: false, href: null });
  });
});

describe('the point it places', () => {
  it('says Anonymous when nobody is credited', () => {
    expect(pointOf(composeEntry(good)).by_line).toBe('Anonymous');
  });

  it('carries the credit when there is one', () => {
    expect(pointOf(composeEntry({ ...good, credit: 'A teacher' })).by_line).toBe('A teacher');
  });

  it('clusters by month and links back to the story on the index', () => {
    const point = pointOf(composeEntry(good));

    expect(point.month).toBe('2026-09');
    expect(point.read_href).toBe('/story/all?story=the-chairs-moved');
  });

  it('leaves the arc empty rather than guessing one', () => {
    expect(pointOf(composeEntry(good)).arc).toBeNull();
    expect(pointOf(composeEntry(good), 'GLOW').arc).toBe('GLOW');
  });
});

/* ------------------------------------------------ the road that came first */

function submission(over: Partial<StorySubmission> = {}): StorySubmission {
  return {
    id: 'u1',
    created_at: '2026-09-11T09:00:00Z',
    body: 'We were folding chairs.\n\nNobody left.',
    door: 'I lived it',
    format: ['writing'],
    arc_stage: 'ME + WE',
    credit_name: 'Areum J.',
    consent: true,
    email: 'areum@example.org',
    attachment_url: null,
    source_page: '/story/submit',
    status: 'pending',
    published_as: null,
    ...over,
  } as unknown as StorySubmission;
}

describe('publishing a submission, unchanged', () => {
  it('builds the eyebrow from the door and the context an editor adds', () => {
    const entry = buildEntry(submission(), {
      slug: 'the-chairs-moved',
      title: 'The chairs moved themselves',
      topic: 'noticed',
      context: 'A closing circle',
    });

    expect(copyOf(entry.en).eyebrow).toBe('I lived it · A closing circle');
  });

  it('reads the credit, the day and the attachment off the row', () => {
    const entry = buildEntry(submission({ attachment_url: '/story-img/chairs.jpg' }), {
      slug: 'the-chairs-moved',
      title: 'The chairs moved themselves',
      topic: 'noticed',
    });

    expect(copyOf(entry.en).credit).toBe('Areum J.');
    expect(entry.published_on).toBe('2026-09-11');
    expect(entry.image).toBe('/story-img/chairs.jpg');
  });

  it('still takes the arc from the row when the reviewer does not override it', () => {
    const entry = buildEntry(submission(), {
      slug: 'the-chairs-moved',
      title: 'The chairs moved themselves',
      topic: 'noticed',
    });

    expect(buildPoint(entry, submission()).arc).toBe('ME + WE');
    expect(buildPoint(entry, submission(), 'GLOW').arc).toBe('GLOW');
  });
});
