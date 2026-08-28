import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchConstellation } from '../services/content';
import { watchTable } from '../services/realtime';
import { CONSTELLATION, FORMAT_COLORS, type ConstellationPoint } from '../content/constellation';

/**
 * The Constellation — every story as a light, clustered by format or topic.
 *
 * Placement is deterministic, not random: each cluster gets a cell on a loose
 * grid, and within a cluster the points spiral out at the golden angle, seeded
 * by the group name. The same data always draws the same sky, which is what
 * makes a point's position mean something between visits.
 */

export type Lang = 'EN' | 'KO';

interface Dot {
  title: string;
  onClick: () => void;
  enter: () => void;
  leave: () => void;
  style: string;
  inner: string;
}

const MODES = [
  { id: 'format' as const, label: 'Format', of: (p: ConstellationPoint) => p.format },
  { id: 'topic' as const, label: 'Topic', of: (p: ConstellationPoint) => p.topic },
];

const CLOSE_DELAY = 260;

export default function useConstellation(lang: Lang = 'EN') {
  const [points, setPoints] = useState<ConstellationPoint[]>(CONSTELLATION);
  const [mode, setMode] = useState<'format' | 'topic'>('format');
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

  /** Cluster centres on a loose grid, staggered row by row. */
  const { groups, centers, byGroup } = useMemo(() => {
    const order: string[] = [];
    const buckets: Record<string, ConstellationPoint[]> = {};

    for (const point of points) {
      const group = active.of(point);
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

  const dots: Dot[] = [];
  for (const group of groups) {
    const members = byGroup[group];
    members.forEach((point, i) => {
      // Golden-angle spiral, offset by the group name so two clusters of the
      // same size do not come out as the same shape.
      const angle = i * 2.39996 + group.length;
      const radius = members.length === 1 ? 0 : 3.5 + 8.5 * Math.sqrt((i + 1) / members.length);
      const x = Math.min(95, Math.max(4, centers[group].x + Math.cos(angle) * radius * 1.15));
      const y = Math.min(92, Math.max(6, centers[group].y + Math.sin(angle) * radius));

      const color = FORMAT_COLORS[point.format] ?? '#FAF4E2';
      const on = selected === point.id;
      if (on) selectedPosition.current = { x, y };

      dots.push({
        title: point.title,
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

  const labels = groups.map((group) => ({
    text: group,
    style:
      `position:absolute; left:${centers[group].x}%; top:${Math.max(2, centers[group].y - 16)}%; ` +
      "transform:translateX(-50%); font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; " +
      'letter-spacing:0.16em; text-transform:uppercase; color:rgba(250,244,226,0.55); ' +
      'white-space:nowrap; pointer-events:none;',
  }));

  const modeButtons = MODES.map((m) => {
    const on = m.id === mode;
    return {
      label: m.label,
      onClick: () => setMode(m.id),
      style:
        "font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; letter-spacing:0.1em; " +
        'text-transform:uppercase; border-radius:999px; padding:11px 22px; cursor:pointer; line-height:1.2; ' +
        `border:1.5px solid ${on ? '#F0D23C' : 'rgba(250,244,226,0.35)'}; ` +
        `background:${on ? '#F0D23C' : 'transparent'}; color:${on ? '#1A1613' : 'rgba(250,244,226,0.85)'};`,
    };
  });

  const legend = Object.entries(FORMAT_COLORS).map(([format, color]) => ({
    label: format,
    swatch:
      `display:inline-block; width:11px; height:11px; border-radius:50%; ` +
      `background:${color}; box-shadow:0 0 8px 1px ${color}66;`,
  }));

  const point = points.find((p) => p.id === selected) ?? null;
  const pointColor = point ? (FORMAT_COLORS[point.format] ?? '#2E3B40') : '#2E3B40';
  const position = point ? selectedPosition.current : { x: 50, y: 50 };
  const px = Math.min(78, Math.max(22, position.x));
  const below = position.y < 42;

  const hint =
    lang === 'KO'
      ? `${points.length}개의 빛 — 하나를 가리키거나 눌러 보세요`
      : `${points.length} lights and growing — hover or tap one`;

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
    selTitle: point?.title ?? '',
    selCaption: point?.caption ?? '',
    selMeta: point ? `${point.by ?? ''} · ${point.month}` : '',
    selFormat: point?.format ?? '',
    selDot:
      `position:absolute; left:19px; top:22px; width:8px; height:8px; ` +
      `border-radius:50%; background:${pointColor};`,
    hasRead: Boolean(point?.read),
    selRead: point?.read ?? '#',
    hasMedia: Boolean(point?.media),
    selMedia: point?.media ?? '#',
    mediaLabel: point?.format === 'video' ? 'WATCH' : 'LISTEN',
    hasView: Boolean(point?.view),
    selView: point?.view ?? '#',
  };
}
