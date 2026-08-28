import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { modelFor } from '../lib/page-model';
import { isSupabaseConfigured } from '../lib/supabase';
import { statusSnapshot, subscribeStatus, type Source, type Watch } from '../lib/services/status';
import type { ContentTable } from '../lib/content/types';

/**
 * The page model, as the page in front of you is actually running it.
 *
 * Development only — SiteLayout renders it behind `import.meta.env.DEV`, and
 * the module has no side effects, so the production build drops it entirely.
 *
 * It exists because the bundled fallback is invisible by design. A card wall
 * reading month-old bundled rows looks exactly like one reading the database,
 * which is a pleasant property for a visitor and a trap for whoever is editing
 * content and wondering why nothing changed. This says which, per table, and
 * whether row changes are arriving.
 *
 * It is also where the page model gets checked. The hooks are what actually read
 * — `useNews` names `news` itself — so a model can name a table the page never
 * touches and nothing would notice. A modelled table that has still reported
 * nothing once the page has settled is flagged here and in the console.
 */

const SOURCE_COLOR: Record<Source, string> = {
  live: '#35C0B4',
  bundled: '#C9962B',
  absent: '#FAB414',
  error: '#FF5A5A',
};

const SOURCE_LABEL: Record<Source, string> = {
  live: 'database',
  bundled: 'bundled copy',
  absent: 'no such table yet',
  error: 'query failed',
};

/** Worst first — a page is only as live as its least-live table. */
const SEVERITY: Source[] = ['error', 'absent', 'bundled', 'live'];

/** Long enough for a slow query, short enough to still be looking at the page. */
const SETTLE_MS = 3000;

const WATCH_LABEL: Record<Watch, string> = {
  watching: 'watching',
  connecting: 'connecting…',
  off: 'not watching',
  error: 'realtime off',
};

const PANEL: CSSProperties = {
  position: 'fixed',
  left: 16,
  bottom: 16,
  zIndex: 9999,
  maxWidth: 400,
  fontFamily: "'Archivo', system-ui, sans-serif",
  fontSize: 12,
  lineHeight: 1.45,
  color: '#FAF4E2',
  background: 'rgba(26,22,19,0.93)',
  border: '1px solid rgba(250,244,226,0.22)',
  borderRadius: 10,
  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  overflow: 'hidden',
};

const BUTTON: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '9px 13px',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 700,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  textAlign: 'left',
};

const ROW: CSSProperties = {
  padding: '9px 13px',
  borderTop: '1px solid rgba(250,244,226,0.14)',
};

const MUTED: CSSProperties = { color: 'rgba(250,244,226,0.62)', fontWeight: 400 };

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 7px 1px ${color}77`,
      }}
    />
  );
}

interface Props {
  /** The route as registry.ts spells it — `useLocation().pathname`. */
  route: string;
}

export default function ContentStatus({ route }: Props) {
  const statuses = useSyncExternalStore(subscribeStatus, statusSnapshot);
  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);

  const model = modelFor(route);
  const reads = model?.reads ?? [];
  const writes = model?.writes ?? [];
  const gaps = model?.gaps ?? [];

  const statusOf = (table: ContentTable) => statuses.find((status) => status.table === table);

  // The status store is global and outlives a navigation, so "this table has
  // never reported" only means something once the page has had time to read.
  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [route]);

  const unread = settled ? reads.filter((read) => !statusOf(read.table)) : [];

  useEffect(() => {
    if (!unread.length) return;
    console.warn(
      `[IN] ${route} models ${unread.map((read) => read.table).join(', ')}, but nothing on the page read ` +
        'it. Either the page lost a hook, or page-model.ts names a table it should not.',
    );
    // Once per route, not once per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, unread.length]);

  // The pill reports the worst thing happening on this page: a page is only
  // "live" when every table it reads is.
  const sources = reads.map((read) => statusOf(read.table)?.source ?? 'bundled');
  const overall: Source = SEVERITY.find((source) => sources.includes(source)) ?? 'bundled';

  const summary = !model
    ? 'no page model'
    : reads.length === 0
      ? 'copy in the component'
      : `${reads.length} ${reads.length === 1 ? 'table' : 'tables'} · ${SOURCE_LABEL[overall]}`;

  return (
    <aside style={PANEL} aria-label="Page content model">
      <button type="button" style={BUTTON} onClick={() => setOpen((was) => !was)} aria-expanded={open}>
        <Dot color={reads.length ? SOURCE_COLOR[overall] : 'rgba(250,244,226,0.4)'} />
        <span style={{ flex: 1 }}>{model?.title ?? route}</span>
        <span style={MUTED}>{summary}</span>
        <span aria-hidden="true" style={MUTED}>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <>
          <div style={{ ...ROW, ...MUTED }}>
            <code>{route}</code>
            {model ? ` · ${model.section} · ${model.lang}` : ' · not in PAGE_MODELS'}
          </div>

          {reads.map((read) => {
            const status = statusOf(read.table);
            const source = status?.source ?? 'bundled';
            const missing = settled && !status;
            return (
              <div key={`${read.table}-${read.feed ?? ''}`} style={ROW}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Dot color={missing ? '#FF5A5A' : SOURCE_COLOR[source]} />
                  <strong>
                    {read.table}
                    {read.feed ? `(${read.feed})` : ''}
                  </strong>
                  <span style={MUTED}>
                    {missing ? 'modelled, but nothing read it' : SOURCE_LABEL[source]}
                    {status?.rows ? ` · ${status.rows} rows` : ''}
                    {/* A subscription to a table that does not exist succeeds and
                        then stays silent, so saying "watching" would be true and
                        misleading at once. */}
                    {missing || source === 'absent' ? '' : ` · ${WATCH_LABEL[status?.watch ?? 'off']}`}
                  </span>
                </div>
                <div style={{ ...MUTED, paddingLeft: 16 }}>{read.drives}</div>
              </div>
            );
          })}

          {writes.map((write) => (
            <div key={write.table} style={ROW}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dot color="#9B7BE0" />
                <strong>{write.table}</strong>
                <span style={MUTED}>write only</span>
              </div>
              <div style={{ ...MUTED, paddingLeft: 16 }}>{write.drives}</div>
            </div>
          ))}

          {gaps.map((gap) => (
            <div key={`gap-${gap.table}`} style={ROW}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dot color="#FAB414" />
                <strong>{gap.table}</strong>
                <span style={MUTED}>not wired up yet</span>
              </div>
              <div style={{ ...MUTED, paddingLeft: 16 }}>{gap.drives}</div>
            </div>
          ))}

          {reads.length === 0 && writes.length === 0 && gaps.length === 0 ? (
            <div style={{ ...ROW, ...MUTED }}>
              This page's copy lives in its component — nothing here reads a table.
            </div>
          ) : null}

          {sources.includes('absent') ? (
            <div style={{ ...ROW, ...MUTED }}>
              Run <code>schema.sql</code>, then the seeds, to make this page's content editable.
            </div>
          ) : null}

          {isSupabaseConfigured ? null : (
            <div style={{ ...ROW, ...MUTED }}>
              No Supabase keys — copy <code>.env.example</code> to <code>.env.local</code> to read live rows.
            </div>
          )}
        </>
      ) : null}
    </aside>
  );
}
