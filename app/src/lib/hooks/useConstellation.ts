import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchConstellation } from '../services/content';
import { watchTable } from '../services/realtime';
import { CONSTELLATION, FORMAT_COLORS, type ConstellationPoint } from '../content/constellation';
import { inLang } from '../content/types';
import { useTranslation } from 'react-i18next';
import { useLocaleOr, type Locale } from '../lang';

/**
 * The Constellation — every story as a light, clustered by format or topic.
 *
 * Format and Topic are deterministic: each cluster gets a cell on a loose
 * grid, and within a cluster the points spiral out at the golden angle, seeded
 * by the group name. The same data always draws the same sky, which is what
 * makes a point's position mean something between visits.
 *
 * Random is the one mode that is not: no clusters, every light scattered over
 * the whole sky from a seed that is rolled each time the button is pressed.
 * Positions come from the seed and the point's id, so a realtime refetch does
 * not reshuffle the sky under the reader — only pressing Random again does.
 */

export type { Locale };

interface Dot {
  title: string;
  onClick: () => void;
  enter: () => void;
  leave: () => void;
  style: string;
  inner: string;
}

type Mode = 'format' | 'topic' | 'random';

const MODES: { id: Mode; of?: (p: ConstellationPoint) => string }[] = [
  { id: 'format', of: (p) => p.format },
  { id: 'topic', of: (p) => p.topic },
  { id: 'random' },
];

const MODE_LABELS = { format: 'sky.format', topic: 'sky.topic', random: 'sky.random' } as const;

/** FNV-1a — turns a point id into a number the seed can be mixed with. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a small seeded generator, so a seed always draws the same scatter. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far apart (in % of the sky) two scattered lights try to stay. */
const SCATTER_GAP = 7;
const SCATTER_TRIES = 24;

/**
 * Every point somewhere in the sky, drawn from the seed. Each point takes the
 * first of its candidates that keeps clear of the ones already placed, or the
 * roomiest one if none does. Points are visited in id order so the result does
 * not depend on the order the database returned them in.
 */
function scatter(points: ConstellationPoint[], seed: number): Record<string, { x: number; y: number }> {
  const placed: Record<string, { x: number; y: number }> = {};
  const taken: { x: number; y: number }[] = [];
  const ids = points.map((p) => p.id).sort();

  for (const id of ids) {
    const next = seeded(seed ^ hash(id));
    let best = { x: 50, y: 50 };
    let bestRoom = -1;
    for (let i = 0; i < SCATTER_TRIES; i++) {
      const candidate = { x: 6 + next() * 88, y: 8 + next() * 82 };
      // The sky is wider than it is tall, so a step across counts for less.
      const room = taken.reduce(
        (min, t) => Math.min(min, Math.hypot((candidate.x - t.x) / 1.15, candidate.y - t.y)),
        Infinity,
      );
      if (room > bestRoom) {
        best = candidate;
        bestRoom = room;
      }
      if (room >= SCATTER_GAP) break;
    }
    placed[id] = best;
    taken.push(best);
  }
  return placed;
}

const rollSeed = () => Math.floor(Math.random() * 4294967296);

const CLOSE_DELAY = 260;

export default function useConstellation(given?: Locale) {
  const locale = useLocaleOr(given);
  const { t } = useTranslation();
  const [points, setPoints] = useState<ConstellationPoint[]>(CONSTELLATION);
  const [mode, setMode] = useState<Mode>('format');
  const [seed, setSeed] = useState(rollSeed);
  const [selected, setSelected] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedPosition = useRef({ x: 50, y: 50 });

  useEffect(() => {
    let cancelled = false;

    const read = () =>
      fetchConstellation().then((rows) => {
        if (!cancelled && rows) setPoints(rows);
      });

    read();
    const stopWatching = watchTable('constellation_points', read);

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function closeSoon() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setSelected(null), CLOSE_DELAY);
  }

  const active = MODES.find((m) => m.id === mode) ?? MODES[0];

  /** Where each light sits in Random mode — nothing when another mode is on. */
  const scattered = useMemo(
    () => (mode === 'random' ? scatter(points, seed) : null),
    [points, mode, seed],
  );

  /** Cluster centres on a loose grid, staggered row by row. */
  const { groups, centers, byGroup } = useMemo(() => {
    // Random has no clusters: one unnamed group that carries every point.
    if (!active.of) return { groups: [''], centers: { '': { x: 50, y: 50 } }, byGroup: { '': points } };

    const order: string[] = [];
    const buckets: Record<string, ConstellationPoint[]> = {};

    for (const point of points) {
      const group = active.of!(point);
      if (!buckets[group]) {
        buckets[group] = [];
        order.push(group);
      }
      buckets[group].push(point);
    }

    const count = order.length;
    const cols = Math.min(count, Math.max(2, Math.ceil(Math.sqrt(count * 1.7))));
    const rows = Math.ceil(count / cols) || 1;

    const positions: Record<string, { x: number; y: number }> = {};
    order.forEach((group, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[group] = {
        x: 10 + ((col + 0.5) / cols) * 80 + (row % 2 ? 4 : -4),
        y: 14 + ((row + 0.5) / rows) * 68,
      };
    });

    return { groups: order, centers: positions, byGroup: buckets };
  }, [points, active]);

  /**
   * Group key → what the label should say.
   *
   * The sky clusters on the English key in both languages, so a topic that has
   * been translated and one that has not still land in the same cluster. Only
   * the text above the cluster changes.
   */
  const groupLabel = (group: string): string => {
    if (mode === 'format') return t(`sky.formats.${group}` as 'sky.formats.writing', group);
    const translated = points.find((p) => p.topic === group && p.topicKo);
    return inLang(group, { ko: translated?.topicKo, 'zh-TW': translated?.topicZhTw }, locale) ?? group;
  };

  const dots: Dot[] = [];
  for (const group of groups) {
    const members = byGroup[group];
    members.forEach((point, i) => {
      // Golden-angle spiral, offset by the group name so two clusters of the
      // same size do not come out as the same shape.
      const angle = i * 2.39996 + group.length;
      const radius = members.length === 1 ? 0 : 3.5 + 8.5 * Math.sqrt((i + 1) / members.length);
      const { x, y } = scattered?.[point.id] ?? {
        x: Math.min(95, Math.max(4, centers[group].x + Math.cos(angle) * radius * 1.15)),
        y: Math.min(92, Math.max(6, centers[group].y + Math.sin(angle) * radius)),
      };

      const color = FORMAT_COLORS[point.format] ?? '#FAF4E2';
      const on = selected === point.id;
      if (on) selectedPosition.current = { x, y };

      dots.push({
        title: inLang(point.title, { ko: point.titleKo, 'zh-TW': point.titleZhTw }, locale) ?? point.title,
        onClick: () => setSelected((current) => (current === point.id ? null : point.id)),
        enter: () => {
          clearTimeout(closeTimer.current);
          setSelected(point.id);
        },
        leave: closeSoon,
        style:
          `position:absolute; left:${x}%; top:${y}%; width:44px; height:44px; margin:-22px 0 0 -22px; ` +
          'border:none; background:transparent; cursor:pointer; display:flex; align-items:center; ' +
          'justify-content:center; padding:0;',
        inner:
          `display:block; width:${on ? 20 : 14}px; height:${on ? 20 : 14}px; border-radius:50%; ` +
          `background:${color}; box-shadow:0 0 ${on ? 26 : 14}px ${on ? 6 : 2}px ${color}55` +
          `${on ? ', 0 0 0 3px rgba(250,244,226,0.9)' : ''}; ` +
          `animation-delay:${(point.id.length * 0.37) % 3}s;`,
      });
    });
  }

  const labels = (scattered ? [] : groups).map((group) => ({
    text: groupLabel(group),
    style:
      `position:absolute; left:${centers[group].x}%; top:${Math.max(2, centers[group].y - 16)}%; ` +
      "transform:translateX(-50%); font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; " +
      'letter-spacing:0.16em; text-transform:uppercase; color:rgba(250,244,226,0.55); ' +
      'white-space:nowrap; pointer-events:none;',
  }));

  const modeButtons = MODES.map((m) => {
    const on = m.id === mode;
    return {
      label: t(MODE_LABELS[m.id]),
      // Two buttons, one of them always the current grouping — so each says
      // whether it is the one in effect. Colour alone said it before.
      on,
      // Pressing Random again rolls a new sky; the others just switch.
      onClick: () => {
        if (m.id === 'random') setSeed(rollSeed());
        setMode(m.id);
      },
      style:
        "font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; letter-spacing:0.1em; " +
        'text-transform:uppercase; border-radius:999px; padding:11px 22px; cursor:pointer; line-height:1.2; ' +
        `border:1.5px solid ${on ? '#F0D23C' : 'rgba(250,244,226,0.35)'}; ` +
        `background:${on ? '#F0D23C' : 'transparent'}; color:${on ? '#1A1613' : 'rgba(250,244,226,0.85)'};`,
    };
  });

  const legend = Object.entries(FORMAT_COLORS).map(([format, color]) => ({
    label: t(`sky.formats.${format}` as 'sky.formats.writing', format),
    swatch:
      `display:inline-block; width:11px; height:11px; border-radius:50%; ` +
      `background:${color}; box-shadow:0 0 8px 1px ${color}66;`,
  }));

  const point = points.find((p) => p.id === selected) ?? null;
  const pointColor = point ? (FORMAT_COLORS[point.format] ?? '#2E3B40') : '#2E3B40';
  const position = point ? selectedPosition.current : { x: 50, y: 50 };
  const px = Math.min(78, Math.max(22, position.x));
  const below = position.y < 42;

  const hint = t('sky.hint', { count: points.length });

  return {
    modeButtons,
    labels,
    dots,
    legend,
    skyHint: hint,
    hasSel: Boolean(point),
    popStyle:
      `position:absolute; left:${px}%; top:${position.y}%; ` +
      `transform:translate(-50%, ${below ? '30px' : 'calc(-100% - 30px)'}); ` +
      'width:400px; max-width:94%; background:rgba(243,234,208,0.95); color:#2E3B40; ' +
      'z-index:20; box-shadow:0 18px 60px rgba(0,0,0,0.45);',
    cancelClose: () => clearTimeout(closeTimer.current),
    closeSoon,
    closeSel: () => setSelected(null),
    selTitle: (point && inLang(point.title, { ko: point.titleKo, 'zh-TW': point.titleZhTw }, locale)) ?? '',
    selCaption: (point && inLang(point.caption, { ko: point.captionKo, 'zh-TW': point.captionZhTw }, locale)) ?? '',
    selMeta: point ? `${inLang(point.by, { ko: point.byKo, 'zh-TW': point.byZhTw }, locale) ?? ''} · ${point.month}` : '',
    selFormat: point?.format ?? '',
    selDot:
      `position:absolute; left:19px; top:22px; width:8px; height:8px; ` +
      `border-radius:50%; background:${pointColor};`,
    hasRead: Boolean(point?.read),
    selRead: point?.read ?? '#',
    hasMedia: Boolean(point?.media),
    selMedia: point?.media ?? '#',
    mediaLabel: point?.format === 'video' ? t('sky.watch') : t('sky.listen'),
    hasView: Boolean(point?.view),
    selView: point?.view ?? '#',
  };
}
