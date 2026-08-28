import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchStoryEntries } from '../services/content';
import { watchTable } from '../services/realtime';
import { STORY_ENTRIES, TAXONOMY, type StoryCopy, type StoryEntry } from '../content/stories';

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

export type Lang = 'EN' | 'KO';

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
export interface FeaturedStory extends Omit<IndexedStory, 'paras'> {
  dateLabel: string;
  paras: Paragraph[];
  hasImage: boolean;
  imgStyle: string;
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

const COPY = {
  EN: {
    all: 'All',
    byFormat: 'Filter by format',
    byTopic: 'Filter by topic',
    newest: '· newest first',
    allStories: 'All stories',
    total: (n: number) =>
      `${n} stories and counting — the Constellation grows as neighbors add their own.`,
    older: (n: number) => `Load ${n} older`,
  },
  KO: {
    all: '전체',
    byFormat: '형식으로 보기',
    byTopic: '주제로 보기',
    newest: '· 최신순',
    allStories: '모든 이야기',
    total: (n: number) => `${n}편의 이야기 — 이웃이 더할수록 별자리는 자랍니다.`,
    older: (n: number) => `${n}편 더 보기`,
  },
} as const;

/** `2026-07-16` → `July 2026`. Formatted in UTC so the month never slips. */
function monthLabel(iso: string, lang: Lang): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'KO' ? 'ko-KR' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** One record flattened into the requested language, with labels resolved. */
function flatten(entry: StoryEntry, lang: Lang): IndexedStory {
  const key = lang === 'KO' ? 'ko' : 'en';
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

export default function useStoryIndex(lang: Lang = 'EN') {
  const words = COPY[lang];
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
    () => entries.map((entry) => flatten(entry, lang)).sort((a, b) => b.date.localeCompare(a.date)),
    [entries, lang],
  );

  // ?story=<id> selects the featured story, which is what the permalinks do.
  const requested = params.get('story');
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
    const offered = Object.values(TAXONOMY.format).map((v) => (lang === 'KO' ? v.ko : v.en));
    const extra = [...new Set(all.map((s) => s.format))].filter((f) => !offered.includes(f));
    return [words.all, ...offered, ...extra];
  }, [all, mode, lang, words.all]);

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
    const label = monthLabel(story.date, lang);
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

  const current: FeaturedStory | undefined = source && {
    ...source,
    dateLabel: monthLabel(source.date, lang),
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
    hasImage: Boolean(source.image),
    imgStyle: source.image
      ? `width:100%; aspect-ratio:${source.imageRatio ?? '16/10'}; margin-top:34px; ` +
        `background-image:url('${source.image}'); background-size:${source.imageFit ?? 'cover'}; ` +
        `background-repeat:no-repeat; background-position:${source.imagePosition ?? 'center'}; background-color:#F3EAD0;`
      : '',
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
