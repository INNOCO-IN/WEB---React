import { useMemo, useState } from 'react';
import { STORY_ENTRIES, TAXONOMY } from '../lib/content/stories';

/**
 * Story-This-Is-Us — the rail beside the story, listing the rest.
 *
 * A trimmed version of the Story index: filter by format or topic, no search
 * and no pagination, and each row is a link rather than a selection because
 * this page shows one story rather than swapping between them.
 */

const INK = '#1A1613';
const PAPER = '#FAF4E2';
const ALL = 'All';

/** This page's own id, so the current story can be marked in the list. */
const SELF = 'this-is-us';

const pillStyle = (on: boolean) =>
  "text-align:left; cursor:pointer; font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; " +
  `letter-spacing:0.03em; padding:9px 14px; border-radius:999px; ` +
  `border:1.5px solid ${on ? INK : 'rgba(26,22,19,0.22)'}; background:${on ? INK : 'transparent'}; ` +
  `color:${on ? PAPER : INK};`;

const toggleStyle = (on: boolean) =>
  "cursor:pointer; font-family:'Archivo',sans-serif; font-weight:700; font-size:12px; " +
  'letter-spacing:0.08em; text-transform:uppercase; padding:8px 15px; border-radius:999px; ' +
  `border:1.5px solid ${INK}; background:${on ? INK : 'transparent'}; color:${on ? PAPER : INK};`;

export default function useLogic() {
  const [mode, setMode] = useState<'format' | 'topic'>('format');
  const [filter, setFilter] = useState<string>(ALL);

  const all = useMemo(
    () =>
      STORY_ENTRIES.map((entry) => ({
        id: entry.id,
        title: entry.en.title,
        href: entry.href ? `/story/all?story=${entry.id}` : `/story/all?story=${entry.id}`,
        format: TAXONOMY.format[entry.format]?.en ?? entry.format,
        topic: TAXONOMY.topic[entry.topic]?.en ?? entry.topic,
      })),
    [],
  );

  const key = mode === 'format' ? 'format' : 'topic';
  const options = [ALL, ...new Set(all.map((story) => story[key]))];

  const filters = options.map((option) => ({
    label: option,
    style: pillStyle(option === filter),
    pick: () => setFilter(option),
  }));

  const shown = filter === ALL ? all : all.filter((story) => story[key] === filter);

  const index = shown.map((story) => {
    const current = story.id === SELF;
    return {
      title: story.title,
      href: story.href,
      meta: `${story.format} · ${story.topic}`,
      style:
        `display:block; text-decoration:none; cursor:pointer; ` +
        `background:${current ? 'rgba(201,150,43,0.14)' : 'transparent'}; ` +
        `border-bottom:1px solid rgba(26,22,19,0.12); padding:14px 8px 14px 10px; ` +
        (current ? 'box-shadow: inset 3px 0 0 #C9962B;' : ''),
    };
  });

  return {
    filters,
    index,
    filterHeading: mode === 'format' ? 'Filter by format' : 'Filter by topic',
    indexHeading: `${filter === ALL ? 'All stories' : filter} · newest first`,
    byFormatStyle: toggleStyle(mode === 'format'),
    byTopicStyle: toggleStyle(mode === 'topic'),
    setByFormat: () => {
      setMode('format');
      setFilter(ALL);
    },
    setByTopic: () => {
      setMode('topic');
      setFilter(ALL);
    },
  };
}
