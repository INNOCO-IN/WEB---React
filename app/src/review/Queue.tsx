import { useCallback, useMemo, useState } from 'react';
import { FORMATS } from '../lib/story-promotion';
import {
  BULK_STATUS,
  archiveMany,
  declineStory,
  setStatus,
  type IntakeTable,
  type StoryRow,
} from '../lib/services/review';
import type { DeskCopy } from './copy';
import {
  HANDLED_PAGE,
  NO_FILTERS,
  applyFilters,
  chipsFor,
  clearAll,
  clearChip,
  facetsFor,
  group,
  years,
  type DeskFilters,
  type DeskRow,
} from './filters';
import { FilterBar, Chips } from './FilterBar';
import { GroupDivider } from './parts';
import { Row } from './Rows';
import { Empty, Failed, Reading } from './States';

/**
 * One queue: the filter bar, the two groups, and what a decision does.
 *
 * The rows arrive already fetched, because the tab rail's counts need all three
 * queues whether or not you are looking at them — the counts are the only
 * ambient signal in the product and they are what makes three queues cheaper
 * than one merged stream.
 */

export interface QueueProps {
  table: IntakeTable;
  rows: DeskRow[];
  copy: DeskCopy;
  loading: boolean;
  error: string | null;
  /** Re-reads the queue after a write, or after "Try again". */
  reload: () => void;
  onSignIn: () => void;
  today: string;
  /** Typed in the chrome, read here — see the note on the field in Desk.tsx. */
  search: string;
  onSearch: (value: string) => void;
}

export default function Queue({
  table,
  rows,
  copy,
  loading,
  error,
  reload,
  onSignIn,
  today,
  search,
  onSearch,
}: QueueProps) {
  const [filters, setFilters] = useState<DeskFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [writeError, setWriteError] = useState<string | null>(null);

  // The search text is the chrome's and the rest are the queue's, but they
  // narrow together — so they are one object from here down, and the chip that
  // clears the search reaches back up rather than writing to a copy of it.
  const active = useMemo<DeskFilters>(() => ({ ...filters, search }), [filters, search]);

  const shown = useMemo(() => applyFilters(rows, active, today), [rows, active, today]);
  const { waiting, handled } = useMemo(() => group(shown), [shown]);
  const chips = useMemo(() => chipsFor(active, copy), [active, copy]);
  const facets = useMemo(() => facetsFor(table, rows, FORMATS, copy), [table, rows, copy]);
  const handledYears = useMemo(() => years(handled), [handled]);

  const visibleHandled = handled.slice(0, page * HANDLED_PAGE);
  const bulk = BULK_STATUS[table];

  // Every decision in the desk is one column, except one. Declining a story
  // may also have to take it off the index and off the Constellation, and that
  // needs the submission rather than its id — so this hands the row over and
  // `declineStory` does the rest. Publishing never arrives here at all: the
  // button for it is a link to a screen (see `Decisions` in Rows.tsx).
  const move = useCallback(
    async (id: string, status: string) => {
      const story =
        table === 'stories' && status === 'declined'
          ? rows.find((entry) => entry.id === id)
          : undefined;

      const failed = story
        ? await declineStory(story.row as StoryRow)
        : await setStatus(table, id, status);

      setWriteError(failed);
      if (!failed) reload();
    },
    [table, rows, reload],
  );

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function archiveSelected() {
    const failed = await archiveMany(table, [...selected]);
    setWriteError(failed);
    if (failed) return;
    setSelected(new Set());
    setSelecting(false);
    reload();
  }

  const update = (patch: Partial<DeskFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  /** Removes one chip. The search chip is the chrome's, so it goes back up. */
  const drop = (key: string) => {
    if (key === 'search') onSearch('');
    else setFilters(clearChip(filters, key));
    setPage(1);
  };

  return (
    <>
      <FilterBar filters={filters} facets={facets} copy={copy} update={update} />

      <Chips
        chips={chips}
        copy={copy}
        drop={drop}
        clear={() => {
          setFilters(clearAll(filters));
          onSearch('');
          setPage(1);
        }}
      />

      {writeError ? (
        <p className="rv-failed-detail" style={{ borderLeft: '3px solid var(--rv-failed)', padding: '10px 0 10px 14px', marginTop: '20px' }}>
          {writeError}
        </p>
      ) : null}

      {loading ? (
        <Reading copy={copy} />
      ) : error ? (
        <Failed copy={copy} detail={error} onRetry={reload} onSignIn={onSignIn} />
      ) : !rows.length ? (
        <Empty>{copy.empty[table]}</Empty>
      ) : !shown.length ? (
        <Empty>Nothing matches those filters. {chips.length ? 'Clear one above to widen the queue.' : ''}</Empty>
      ) : (
        <>
          {/* Waiting is the work, so it is never paged: however many are
              waiting, they are all on the page, open, in full. */}
          {waiting.length ? (
            <>
              <GroupDivider label={`${waiting.length} ${copy.waiting}`} aside={copy.allShown} />
              {waiting.map((entry) => (
                <Row key={entry.id} entry={entry} copy={copy} onMove={move} />
              ))}
            </>
          ) : null}

          {handled.length ? (
            <>
              <GroupDivider
                handled
                label={`${handled.length} ${copy.handled}`}
                aside={
                  handled.length > visibleHandled.length ? copy.showing(visibleHandled.length, handled.length) : copy.allShown
                }
              />

              {/* Selection is off until asked for, and it only ever offers
                  archive — the one status where doing forty at once is honest.
                  Stories have no selection at all. */}
              {bulk ? (
                selecting ? (
                  <div className="rv-select-bar">
                    <span className="rv-label-strong">{copy.selected(selected.size)}</span>
                    <button
                      type="button"
                      className="rv-btn-secondary"
                      disabled={!selected.size}
                      onClick={() => void archiveSelected()}
                    >
                      {copy.archiveSelected}
                    </button>
                    <button
                      type="button"
                      className="rv-btn-secondary"
                      onClick={() => {
                        setSelecting(false);
                        setSelected(new Set());
                      }}
                    >
                      {copy.clearSelection}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '18px 0 0' }}>
                    <button type="button" className="rv-btn-quiet" onClick={() => setSelecting(true)}>
                      {copy.selectRows}
                    </button>
                  </div>
                )
              ) : null}

              {visibleHandled.map((entry) => (
                <Row
                  key={entry.id}
                  entry={entry}
                  copy={copy}
                  onMove={move}
                 
                  selection={
                    bulk ? { on: selecting, selected: selected.has(entry.id), toggle } : undefined
                  }
                />
              ))}

              {handled.length > visibleHandled.length ? (
                <div className="rv-actions" style={{ paddingTop: '32px' }}>
                  <button type="button" className="rv-btn-secondary" onClick={() => setPage((n) => n + 1)}>
                    {copy.showMore}
                  </button>
                  {handledYears.length > 1 ? (
                    <span className="rv-label rv-quiet" style={{ alignSelf: 'center' }}>
                      {copy.jumpTo}{' '}
                      {handledYears.map((entry) => (
                        <button
                          key={entry.year}
                          type="button"
                          className="rv-btn-quiet"
                          style={{ marginLeft: '10px' }}
                          onClick={() => update({ arrived: 'range', from: `${entry.year}-01-01`, to: `${entry.year}-12-31` })}
                        >
                          {entry.year} · {entry.count}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </>
  );
}
