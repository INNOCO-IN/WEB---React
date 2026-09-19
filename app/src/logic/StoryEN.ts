import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchStoryEntries } from '../lib/services/content';
import { watchTable } from '../lib/services/realtime';
import { STORY_ENTRIES, TAXONOMY, type StoryEntry } from '../lib/content/stories';
import { wall } from '../lib/story-wall';
import { localize, useLocale, type Locale } from '../lib/lang';

/**
 * Story — the four cards whose note appears on hover, and the grid below them.
 *
 * Two unrelated jobs in one hook because the page has one hook. The cards are
 * a pointer state; the grid is the published collection, read from
 * `story_entries` the way `/story/all` and the Constellation read it.
 *
 * **Why the grid moved here.** It used to be twelve `<article>` blocks written
 * out in `site/Story.EN.dc.html`, and so it was still showing those twelve
 * after the desk had published a thirteenth and after it had taken one down.
 * The story the reviewer decided about and the card on this page were two
 * different things that happened to say the same words on the day the design
 * was drawn. They are one thing now.
 *
 * Which of them the wall shows, and in what order, is `lib/story-wall.ts` —
 * the date decides until a reviewer pins one at the desk, and the desk asks
 * that same function which cards it is looking at.
 *
 * `hide` closes only if the card asking is the one that is open. The pointer
 * leaves the card it is on after it has entered the next one, so a plain close
 * would shut the card that had just been opened.
 *
 * The page binds each card to both the pointer and the keyboard — `onMouseEnter`
 * with `onFocus`, `onMouseLeave` with `onBlur` — so the note is reachable
 * without a mouse. StoryKO re-exports this: which card is open is not a thing
 * that differs by language, and which stories are published is not either —
 * the locale is read off the route, so one hook serves both pages.
 */

/** `story_entries` carries `en` and `ko`; anything else reads the English side. */
const ENTRY_KEY: Record<Locale, 'en' | 'ko'> = { en: 'en', 'zh-TW': 'en', ko: 'ko' };

/**
 * A headline the collection wrote as a quotation.
 *
 * The design sets those differently from the rest — italic in English, and in
 * Korean a different weight and leading, because a serif italic is not how
 * Korean emphasises anything. Which of the two a card gets is therefore a
 * question about the title rather than a style, so it is answered here and
 * each page keeps its own two `<h3>`s.
 */
const QUOTED = /^\s*["'“”„«「『]/;

/** The card in the grid, as the page draws it. */
export interface StoryCard {
  /** The permalink, used as the list key. */
  id: string;
  eyebrow: string;
  title: string;
  /** Title in quotation marks — see `QUOTED`. */
  quoted: boolean;
  /** The other one. `sc-if` has no else, so the page asks for both. */
  plain: boolean;
  /** The card blurb. */
  body: string;
  /** `Writing`, `글` — the word beside "Story ·" up the card's spine. */
  format: string;
  /** What the format badge says on hover. */
  formatTitle: string;
  /** True when a picture takes the top of the card, false for the amber band. */
  hasImage: boolean;
  noImage: boolean;
  image: string;
  /** The box the picture fills. */
  plateStyle: string;
  imgStyle: string;
  /** Where the arrow goes — this story on the index, in this language. */
  href: string;
}

export interface StoryCards {
  open1: boolean;
  open2: boolean;
  open3: boolean;
  open4: boolean;
  show1: () => void;
  show2: () => void;
  show3: () => void;
  show4: () => void;
  hide1: () => void;
  hide2: () => void;
  hide3: () => void;
  hide4: () => void;
  stories: StoryCard[];
}

/**
 * One entry as a card.
 *
 * The picture is cropped rather than fitted, and that is the card's own
 * decision rather than the row's: `image_fit` is set to `contain` on four of
 * these, which is right for the reading pane on the index — a tall illustration
 * shown whole — and wrong for a 16/9 slot at the top of a card, where it would
 * letterbox. The ratio and the position *are* the row's, because those are the
 * two things a particular picture needs saying about it.
 */
function card(entry: StoryEntry, locale: Locale): StoryCard {
  const copy = entry[ENTRY_KEY[locale]];
  const format = TAXONOMY.format[entry.format]?.[ENTRY_KEY[locale]] ?? entry.format;
  const quoted = QUOTED.test(copy.title);

  return {
    id: entry.id,
    eyebrow: copy.eyebrow,
    title: copy.title,
    quoted,
    plain: !quoted,
    body: copy.body,
    format,
    formatTitle: `Format: ${format}`,
    hasImage: Boolean(entry.image),
    noImage: !entry.image,
    image: entry.image ?? '',
    plateStyle:
      'position:relative; width:100%; overflow:hidden; background:#F3EAD0; ' +
      `aspect-ratio:${entry.imageRatio ?? '16/9'};`,
    imgStyle:
      'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; ' +
      `object-position:${entry.imagePosition ?? 'center'};`,
    href: `${localize('/story/all', locale)}?story=${entry.id}`,
  };
}

export default function useLogic(): StoryCards {
  const [open, setOpen] = useState(0);
  const [entries, setEntries] = useState<StoryEntry[]>(STORY_ENTRIES);
  const locale = useLocale();

  const show = useCallback((n: number) => () => setOpen(n), []);
  const hide = useCallback((n: number) => () => setOpen((was) => (was === n ? 0 : was)), []);

  // Read once, then again whenever the table changes — the same subscription
  // the index keeps, so publishing or declining a story reaches this page
  // without a reload. `STORY_ENTRIES` is what it shows in the meantime, and in
  // a build with no database keys at all.
  useEffect(() => {
    let cancelled = false;

    const read = () =>
      fetchStoryEntries().then((rows) => {
        if (!cancelled && rows) setEntries(rows);
      });

    void read();
    const stopWatching = watchTable('story_entries', read);

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  const stories = useMemo(() => wall(entries).map((entry) => card(entry, locale)), [entries, locale]);

  return useMemo(
    () => ({
      open1: open === 1,
      open2: open === 2,
      open3: open === 3,
      open4: open === 4,
      show1: show(1),
      show2: show(2),
      show3: show(3),
      show4: show(4),
      hide1: hide(1),
      hide2: hide(2),
      hide3: hide(3),
      hide4: hide(4),
      stories,
    }),
    [open, show, hide, stories],
  );
}
