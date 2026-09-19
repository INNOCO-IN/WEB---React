import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchStoryEntries } from '../services/content';
import { watchTable } from '../services/realtime';
import { STORY_ENTRIES, TAXONOMY, type StoryCopy, type StoryEntry } from '../content/stories';
import { wall } from '../story-wall';

/**
 * The Story index: filter by format or topic, search, paginate, read one.
 *
 * Both language pages ran a copy of this — same logic, different labels — so
 * it is one hook taking `lang`. The taxonomy already carried both languages;
 * only the page did not.
 *
 * `?story=`, `?topic=` and `?format=` stay honoured, since they are the links
 * the Constellation and the home card hand out. They live in the router's
 * search params now rather than being read once on mount, so arriving at a
 * story and then pressing Back does what you expect.
 */

const PAGE = 14;

import { useTranslation } from 'react-i18next';
import { useLocaleOr, type Locale } from '../lang';
import { INTL_LOCALE } from '../../i18n/locales';

/** `story_entries` carries `en` and `ko`; anything else reads the English side. */
const ENTRY_KEY: Record<Locale, 'en' | 'ko'> = { en: 'en', 'zh-TW': 'en', ko: 'ko' };

/** A story flattened into one language, the way the index displays it. */
export interface IndexedStory extends StoryCopy {
  id: string;
  date: string;
  format: string;
  topic: string;
  color: string | null;
  href: string | null;
  draft: boolean;
  image: string | null;
  imageFit: string | null;
  imageRatio: string | null;
  imagePosition: string | null;
}

export interface FilterPill {
  label: string;
  count: number | string;
  countStyle: string;
  style: string;
  pick: () => void;
}

export interface IndexItem {
  title: string;
  meta: string;
  style: string;
  open: () => void;
}

export interface MonthGroup {
  label: string;
  items: IndexItem[];
}

export interface Paragraph {
  t: string;
  style: string;
}

/** The story being read. `paras` is styled here, so it replaces the raw text. */
export interface FeaturedStory extends Omit<IndexedStory, 'paras' | 'image'> {
  dateLabel: string;
  paras: Paragraph[];
  /**
   * The attachment, narrowed to a string because the page puts it in a `src`.
   *
   * The column is called `image` and for a long time only ever held one. The
   * submission form has always accepted four kinds — image, video, audio and
   * PDF — so a story can arrive with a recording or a document in it, and one
   * did: a PDF in an `<img>` renders as an empty frame, silently, because the
   * markup had no other idea. The four flags below are what the page switches
   * on; a story with no attachment gets an empty string rather than a null the
   * markup would have to re-check.
   */
  image: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  /** Anything else, PDF included: shown in a frame, with a link out. */
  isDoc: boolean;
  imgStyle: string;
  audioStyle: string;
  docStyle: string;
  /** The words on the link beside a framed document. */
  docLabel: string;
  hasKicker: boolean;
  kicker1: string;
  kicker2: string;
  isDraft: boolean;
  hasPage: boolean;
}

const INK = '#1A1613';
const PAPER = '#FAF4E2';

const pillStyle = (on: boolean) =>
  'display:flex; align-items:center; justify-content:space-between; gap:8px; text-align:left; ' +
  "cursor:pointer; font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; " +
  `letter-spacing:0.02em; padding:9px 14px; border-radius:999px; border:1.5px solid ${on ? INK : 'rgba(26,22,19,0.2)'}; ` +
  `background:${on ? INK : 'transparent'}; color:${on ? PAPER : INK};`;

const countStyle = (on: boolean) =>
  `font-size:11px; font-weight:700; color:${on ? 'rgba(250,244,226,0.7)' : 'rgba(26,22,19,0.4)'};`;

const toggleStyle = (on: boolean) =>
  "cursor:pointer; font-family:'Archivo',sans-serif; font-weight:700; font-size:12px; " +
  `letter-spacing:0.08em; text-transform:uppercase; padding:8px 16px; border-radius:999px; ` +
  `border:1.5px solid ${INK}; background:${on ? INK : 'transparent'}; color:${on ? PAPER : INK};`;


/** `2026-07-16` → `July 2026`. Formatted in UTC so the month never slips. */
function monthLabel(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * What kind of file an attachment is, read off its name.
 *
 * The kind is a property of the file rather than an editorial decision, so it
 * is derived here instead of being a column someone has to keep in step with
 * the upload. Uploads are named `<uuid>.<ext>` by the submission form, so the
 * extension is reliable; a query string is not part of it.
 *
 * Anything unrecognised is a `doc`, which is the branch that degrades best: a
 * frame that may show nothing, and a link that always works.
 */
type MediaKind = 'image' | 'video' | 'audio' | 'doc';

const MEDIA_KIND: Record<string, MediaKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image', svg: 'image',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', ogv: 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', aac: 'audio', oga: 'audio', ogg: 'audio',
};

function mediaKind(url: string | null): MediaKind | null {
  if (!url) return null;
  const name = url.split(/[?#]/)[0];
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return MEDIA_KIND[ext] ?? 'doc';
}

/** One record flattened into the requested language, with labels resolved. */
function flatten(entry: StoryEntry, locale: Locale): IndexedStory {
  const key = ENTRY_KEY[locale];
  const copy = entry[key];
  return {
    ...copy,
    id: entry.id,
    date: entry.date,
    format: TAXONOMY.format[entry.format]?.[key] ?? entry.format,
    topic: TAXONOMY.topic[entry.topic]?.[key] ?? entry.topic,
    color: entry.color,
    href: entry.href,
    draft: entry.draft,
    image: entry.image,
    imageFit: entry.imageFit,
    imageRatio: entry.imageRatio,
    imagePosition: entry.imagePosition,
  };
}

export default function useStoryIndex(given?: Locale) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  // The index's own labels. They were a table keyed by language in this file;
  // they are interface strings like any other, so they live in the catalogue.
  const words = {
    all: t('stories.all'),
    byFormat: t('stories.byFormat'),
    byTopic: t('stories.byTopic'),
    newest: t('stories.newest'),
    allStories: t('stories.allStories'),
    total: (n: number) => t('stories.total', { count: n }),
    older: (n: number) => t('stories.older', { count: n }),
  };
  const [entries, setEntries] = useState<StoryEntry[]>(STORY_ENTRIES);
  const [params, setParams] = useSearchParams();

  const [mode, setMode] = useState<'format' | 'topic'>(params.get('topic') ? 'topic' : 'format');
  const [filter, setFilter] = useState<string>(params.get('topic') ?? params.get('format') ?? words.all);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;

    const read = () =>
      fetchStoryEntries().then((rows) => {
        if (!cancelled && rows) setEntries(rows);
      });

    read();
    const stopWatching = watchTable('story_entries', read);

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  const all = useMemo(
    () => entries.map((entry) => flatten(entry, locale)).sort((a, b) => b.date.localeCompare(a.date)),
    [entries, locale],
  );

  /**
   * Which story the reading pane opens with.
   *
   * `?story=<id>` wins, because that is what a permalink is — every link the
   * wall, the Constellation and the home card hand out carries one.
   *
   * Without one, it opens on the first card of the wall at the foot of
   * `/story` rather than on whatever is newest. Those were the same answer
   * until the wall could be curated, and then they came apart: a reader who
   * lands on the index bare would start somewhere the rest of the site does
   * not point at, and today that is a test row. `wall` is the same function
   * the wall itself asks — with no pins it still answers "the newest", so this
   * changes nothing on a collection nobody has curated.
   */
  const opensWith = useMemo(() => wall(entries, 1)[0]?.id, [entries]);
  const requested = params.get('story') ?? opensWith;
  const currentIndex = Math.max(0, all.findIndex((s) => s.id === requested));

  function select(index: number) {
    const story = all[index];
    if (!story) return;
    const next = new URLSearchParams(params);
    next.set('story', story.id);
    setParams(next, { replace: false });
  }

  const key = mode === 'format' ? 'format' : 'topic';

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const story of all) out[story[key]] = (out[story[key]] ?? 0) + 1;
    return out;
  }, [all, key]);

  // Every format the submission form offers is listed even at zero, so the
  // index reads as the full set of ways to tell a story, not just the used ones.
  const options = useMemo(() => {
    if (mode !== 'format') {
      return [words.all, ...new Set(all.map((s) => s.topic))];
    }
    const offered = Object.values(TAXONOMY.format).map((v) => (ENTRY_KEY[locale] === 'ko' ? v.ko : v.en));
    const extra = [...new Set(all.map((s) => s.format))].filter((f) => !offered.includes(f));
    return [words.all, ...offered, ...extra];
  }, [all, mode, locale, words.all]);

  const filters: FilterPill[] = options.map((option) => {
    const n = option === words.all ? all.length : (counts[option] ?? 0);
    const on = option === filter;
    return {
      label: option,
      count: n === 0 ? '—' : n,
      countStyle: countStyle(on),
      style: pillStyle(on) + (n === 0 && !on ? ' opacity:0.45;' : ''),
      pick: () => {
        setFilter(option);
        setLimit(PAGE);
      },
    };
  });

  const needle = query.trim().toLowerCase();
  const shown = all
    .filter((story) => filter === words.all || story[key] === filter)
    .filter((story) => !needle || story.title.toLowerCase().includes(needle));

  const limited = shown.slice(0, limit);

  const groups: MonthGroup[] = [];
  for (const story of limited) {
    const label = monthLabel(story.date, locale);
    let group = groups[groups.length - 1];
    if (!group || group.label !== label) {
      group = { label, items: [] };
      groups.push(group);
    }
    const index = all.indexOf(story);
    const on = index === currentIndex;
    group.items.push({
      title: story.title,
      meta: `${story.format} · ${story.topic}`,
      style:
        `text-align:left; cursor:pointer; background:${on ? 'rgba(201,150,43,0.14)' : 'transparent'}; ` +
        `border:none; border-bottom:1px solid rgba(26,22,19,0.1); padding:13px 8px 13px 10px; ` +
        (on ? 'box-shadow: inset 3px 0 0 #C9962B;' : ''),
      open: () => select(index),
    });
  }

  const source = all[currentIndex] ?? all[0];
  const kind = mediaKind(source?.image ?? null);

  const current: FeaturedStory | undefined = source && {
    ...source,
    dateLabel: monthLabel(source.date, locale),
    paras: (source.paras ?? []).map((text, i) =>
      // `## ` marks a section rule inside the body text.
      text.startsWith('## ')
        ? {
            t: text.slice(3),
            style:
              "font-family:'Archivo',sans-serif; font-weight:800; font-size:13px; letter-spacing:0.16em; " +
              'text-transform:uppercase; color:#1E8A86; margin:44px 0 18px; padding-top:22px; ' +
              'border-top:1.5px solid rgba(30,138,134,0.35);',
          }
        : { t: text, style: i === 0 ? 'font-size:26px; line-height:1.5; color:#1A1613; margin:0 0 24px;' : '' },
    ),
    image: source.image ?? '',
    isImage: kind === 'image',
    isVideo: kind === 'video',
    isAudio: kind === 'audio',
    isDoc: kind === 'doc',
    // The box the story's picture fills. It was this element's
    // `background-image` on a `role="img"` div; it is an `<img>` now, so the
    // fit and position become the object-* pair. See the page's markup.
    //
    // A video fills the same box: `object-fit` and `object-position` mean the
    // same thing on a `<video>`, so the two branches share this.
    imgStyle: source.image
      ? `width:100%; aspect-ratio:${source.imageRatio ?? '16/10'}; margin-top:34px; ` +
        `object-fit:${source.imageFit ?? 'cover'}; ` +
        `object-position:${source.imagePosition ?? 'center'}; background-color:#F3EAD0;`
      : '',
    // A player is a control strip, not a picture: full width, its own height.
    audioStyle: 'width:100%; margin-top:34px;',
    // Tall rather than wide — a document is read down the page, and the
    // browser's own viewer brings its scrollbar with it.
    docStyle:
      'width:100%; height:min(78vh, 900px); margin-top:34px; border:1px solid rgba(26,22,19,0.16); ' +
      'background-color:#F3EAD0;',
    docLabel: t('stories.attachment'),
    hasKicker: Boolean(source.kicker?.length),
    kicker1: source.kicker?.[0] ?? '',
    kicker2: source.kicker?.[1] ?? '',
    isDraft: source.draft,
    hasPage: Boolean(source.href),
  };

  const remaining = shown.length - limited.length;

  return {
    filters,
    groups,
    current,
    toTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    totalLine: words.total(all.length),
    filterHeading: mode === 'format' ? words.byFormat : words.byTopic,
    indexHeading: `${filter === words.all ? words.allStories : filter} ${words.newest}`,
    shownCount: String(shown.length),
    query,
    onSearch: (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setLimit(PAGE);
    },
    byFormatStyle: toggleStyle(mode === 'format'),
    byTopicStyle: toggleStyle(mode === 'topic'),
    setByFormat: () => {
      setMode('format');
      setFilter(words.all);
      setLimit(PAGE);
    },
    setByTopic: () => {
      setMode('topic');
      setFilter(words.all);
      setLimit(PAGE);
    },
    hasMore: remaining > 0,
    isEmpty: shown.length === 0,
    loadMoreLabel: words.older(Math.min(remaining, PAGE)),
    loadMore: () => setLimit((n) => n + PAGE),
  };
}
