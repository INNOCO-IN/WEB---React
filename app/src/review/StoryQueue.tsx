import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TAXONOMY } from '../lib/content/stories';
import { FORMATS, TOPICS, copyOf } from '../lib/story-promotion';
import {
  EDITION_LABEL,
  ENTRY_EDITIONS,
  declineStory,
  entryColumn,
  entryEditOf,
  hideEntry,
  saveEntry,
  setStatus,
  setWall,
  type EntryEdit,
  type EntryRow,
  type EntryWord,
  type StoryRow,
} from '../lib/services/review';
import { formatDate } from '../lib/format';
import type { Locale } from '../i18n/locales';
import type { DeskCopy } from './copy';
import { Chips, FilterBar } from './FilterBar';
import {
  HANDLED_PAGE,
  NO_FILTERS,
  applyFilters,
  chipsFor,
  clearAll,
  clearChip,
  facetsFor,
  type DeskFilters,
  type DeskRow,
} from './filters';
import { GroupDivider, Picture, Select, Sep, StatusDot, StatusLine, looksLikeImage } from './parts';
import { Decisions, Row, StoryBody } from './Rows';
import {
  combine,
  groupStories,
  inState,
  matches,
  moved,
  pinned as pinFirst,
  pinnedAll,
  tally,
  unpinned,
  unpinnedAll,
  type StoryItem,
  type StoryState,
} from './stories';
import { Empty, Failed, Reading } from './States';

/**
 * Stories: one list, whichever table a story is in.
 *
 * This tab used to be two — what was sent in, and what is on the site — and a
 * reviewer had to hold the join in their head. They are one list now, in three
 * runs that answer the three questions actually being asked: **waiting** is the
 * work, **on the site** is what a visitor can read right now, and **not on the
 * site** is everything else that exists and is not being served.
 *
 * The join itself is `stories.ts`, tested without a screen. What is here is the
 * screen: the narrowing, the runs, and the two sets of actions a row can carry.
 *
 * **One list is not one fact.** A row still says both things separately —
 * what was decided in the queue (`Pending`, `Published`, `Declined`) and where
 * the story actually is (on the wall, on the site, taken off it, never carried
 * across). Those come apart in practice, and the whole reason this desk exists
 * is that nothing should hide it when they do.
 *
 * The intake filters — door, arc, edition, when it arrived — read fields only a
 * submission has, so switching one on drops the stories that were never
 * submitted. That is most of the collection, which predates the form, and it is
 * the honest answer: the question does not apply to them.
 */

export interface StoryQueueProps {
  /** What visitors sent, as the desk reads intake rows. */
  sent: DeskRow[];
  /** What the site is serving, hidden rows included. */
  entries: EntryRow[];
  copy: DeskCopy;
  loading: boolean;
  /** The two reads fail independently, and the list shows whatever arrived. */
  sentError: string | null;
  entriesError: string | null;
  /** Re-reads both, after a write or after "Try again". */
  reload: () => void;
  onSignIn: () => void;
  /** The signed-in address, stamped onto `edited_by` by every edit. */
  email: string;
  today: string;
  /** Typed in the chrome, read here — see the note on the field in Desk.tsx. */
  search: string;
  onSearch: (value: string) => void;
}

/** What a row can be asked to do, handed down once rather than prop by prop. */
interface Acts {
  /** Moves the submission's status. Declining also takes the story down. */
  move: (id: string, status: string) => void;
  hide: (id: string, hidden: boolean) => void;
  draft: (row: EntryRow, draft: boolean) => void;
  pin: (id: string) => void;
  unpin: (id: string) => void;
  nudge: (id: string, by: -1 | 1) => void;
  reload: () => void;
}

/**
 * Whether a reviewer put this card where it is.
 *
 * `typeof` rather than `!== null`, because there is a third answer: on a
 * database that has not run 20260919160000 the column is not in the row at
 * all, and `undefined !== null` is true — which would have the desk call every
 * story pinned and offer to unpin all of them.
 */
const isPinned = (row: EntryRow) => typeof row.wall_order === 'number';

export default function StoryQueue({
  sent,
  entries,
  copy,
  loading,
  sentError,
  entriesError,
  reload,
  onSignIn,
  email,
  today,
  search,
  onSearch,
}: StoryQueueProps) {
  const [filters, setFilters] = useState<DeskFilters>(NO_FILTERS);
  const [state, setState] = useState<StoryState>('');
  const [livePage, setLivePage] = useState(1);
  const [offPage, setOffPage] = useState(1);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => combine(sent, entries), [sent, entries]);
  const counts = useMemo(() => tally(items), [items]);

  // The words an entry can be found by, built once per read rather than per
  // keystroke — the same bargain `toDeskRow` makes for the submission side.
  const entryText = useMemo(() => {
    const words = new Map<string, string>();

    for (const row of entries) {
      const en = copyOf(row.en);
      const ko = copyOf(row.ko);
      words.set(
        row.id,
        [row.id, row.topic, row.format, en.eyebrow, en.title, en.body, en.credit, ko.title, ko.body]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      );
    }

    return (row: EntryRow) => words.get(row.id) ?? '';
  }, [entries]);

  /**
   * Whether any control that reads a submission's own fields is on.
   *
   * The order control is not one of them: it sorts, it does not narrow. This is
   * what decides whether a story nobody submitted stays in the list.
   */
  const intakeOn = useMemo(
    () =>
      Object.values(filters.facet).some(Boolean) ||
      filters.arrived !== 'any' ||
      filters.language !== 'any',
    [filters],
  );

  // The search is run here rather than through `applyFilters`, because it has
  // to reach both halves: a headline may be on the card, in what was sent, or
  // in only one of the two.
  const passed = useMemo(() => {
    const rows = applyFilters(sent, { ...filters, search: '' }, today);
    return new Set(rows.map((row) => row.id));
  }, [sent, filters, today]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!inState(item, state)) return false;
      if (intakeOn && (!item.sent || !passed.has(item.sent.id))) return false;
      return matches(item, needle, entryText);
    });
  }, [items, state, intakeOn, passed, search, entryText]);

  const runs = useMemo(() => groupStories(shown, filters.order), [shown, filters.order]);
  const chips = useMemo(() => chipsFor({ ...filters, search }, copy), [filters, search, copy]);
  const facets = useMemo(() => facetsFor('stories', sent, FORMATS, copy), [sent, copy]);

  /* ------------------------------------------------------------- the wall */

  /** The cards the wall is showing, in its order — what `Pin these` writes. */
  const onWall = useMemo(
    () =>
      items
        .filter((item) => item.place !== null)
        .sort((a, b) => (a.place ?? 0) - (b.place ?? 0))
        .map((item) => item.entry?.id ?? ''),
    [items],
  );

  /** The pinned ones in their own order — what every move renumbers. */
  const pinned = useMemo(
    () =>
      entries
        .filter((row) => isPinned(row) && !row.hidden)
        .sort(
          (a, b) =>
            (a.wall_order ?? 0) - (b.wall_order ?? 0) ||
            b.published_on.localeCompare(a.published_on),
        )
        .map((row) => row.id),
    [entries],
  );

  /** Sends a move, whichever of the five it is — they all write the run. */
  const write = useCallback(
    async (order: { id: string; wall_order: number | null }[]) => {
      setBusy(true);
      setWriteError(await setWall(order));
      setBusy(false);
      reload();
    },
    [reload],
  );

  const acts: Acts = {
    // Every decision in the desk is one column, except one. Declining a story
    // may also have to take it off the index and off the Constellation, and
    // that needs the submission rather than its id. Publishing never arrives
    // here: that button is a link to a screen (see `Decisions` in Rows.tsx).
    move: (id, status) => {
      void (async () => {
        const story = status === 'declined' ? sent.find((row) => row.id === id) : undefined;
        const failed = story
          ? await declineStory(story.row as StoryRow)
          : await setStatus('stories', id, status);

        setWriteError(failed);
        if (!failed) reload();
      })();
    },
    hide: (id, hidden) => {
      void (async () => {
        setBusy(true);
        setWriteError(await hideEntry(id, hidden));
        setBusy(false);
        reload();
      })();
    },
    // Through `saveEntry` rather than a write of its own, because `draft` *is*
    // in the seed's column list: an unstamped flip would be reverted by the
    // next extract with nothing to show it had happened.
    draft: (row, draft) => {
      void (async () => {
        setBusy(true);
        setWriteError(await saveEntry(row, { draft }, email));
        setBusy(false);
        reload();
      })();
    },
    pin: (id) => void write(pinFirst(pinned, id)),
    unpin: (id) => void write(unpinned(pinned, id)),
    nudge: (id, by) => void write(moved(pinned, id, by)),
    reload,
  };

  /**
   * Takes the wall as it stands and pins every card on it.
   *
   * The one press that turns "the most recent twelve" into "these twelve": once
   * every slot is pinned there is none left for the date to fill, so publishing
   * a thirteenth story no longer pushes one off. It is also how a recent story
   * comes *off* the wall without being taken off the site — pin the twelve you
   * want, then unpin the one you do not.
   */
  const pinTheWall = () => void write(pinnedAll(onWall));
  const clearWall = () => void write(unpinnedAll(pinned));

  /* ------------------------------------------------------------ narrowing */

  const update = (patch: Partial<DeskFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setLivePage(1);
    setOffPage(1);
  };

  /** Removes one chip. The search chip is the chrome's, so it goes back up. */
  const drop = (key: string) => {
    if (key === 'search') onSearch('');
    else setFilters(clearChip(filters, key));
    setLivePage(1);
    setOffPage(1);
  };

  if (loading) return <Reading copy={copy} />;

  // Both reads failed, so there is nothing to show and no partial list to
  // qualify. One failing on its own is a line above the list instead.
  if (sentError && entriesError) {
    return <Failed copy={copy} detail={sentError} onRetry={reload} onSignIn={onSignIn} />;
  }

  const visibleLive = runs.live.slice(0, livePage * HANDLED_PAGE);
  const visibleOff = runs.off.slice(0, offPage * HANDLED_PAGE);

  return (
    <>
      <FilterBar filters={filters} facets={facets} copy={copy} update={update}>
        <Select
          label={copy.entriesWhere}
          value={state}
          any={copy.entriesAnywhere}
          options={[
            { value: 'waiting', label: copy.waiting, count: counts.waiting },
            { value: 'live', label: copy.onSite, count: counts.live },
            { value: 'wall', label: copy.entriesWall, count: counts.wall },
            { value: 'draft', label: copy.statusWord.draft ?? 'draft', count: counts.draft },
            { value: 'hidden', label: copy.entriesHidden, count: counts.hidden },
            { value: 'off', label: copy.notOnSite, count: counts.off },
          ]}
          onChange={(value) => {
            setState(value as StoryState);
            setLivePage(1);
            setOffPage(1);
          }}
        />
      </FilterBar>

      <Chips
        chips={chips}
        copy={copy}
        drop={drop}
        clear={() => {
          setFilters(clearAll(filters));
          setState('');
          onSearch('');
          setLivePage(1);
          setOffPage(1);
        }}
      />

      {/* One read failed and the other did not: say which, and show the half
          that arrived. A story list missing its published half is worth less
          than a story list, but it is worth more than an error page. */}
      {sentError && !entriesError ? <Half detail={sentError} /> : null}
      {entriesError && !sentError ? <Half detail={entriesError} /> : null}
      {writeError ? <Half detail={writeError} /> : null}

      {!items.length ? (
        <Empty>{copy.empty.stories}</Empty>
      ) : !shown.length ? (
        <Empty>{copy.entriesNarrowed}</Empty>
      ) : (
        <>
          {/* Waiting is the work, so it is never paged: however many are
              waiting, they are all on the page, open, in full. */}
          {runs.waiting.length ? (
            <>
              <GroupDivider
                label={`${runs.waiting.length} ${copy.waiting}`}
                aside={copy.allShown}
              />
              {runs.waiting.map((item) => (
                <Line key={item.key} item={item} copy={copy} email={email} acts={acts} busy={busy}
                  pinned={pinned} open={openRow} onOpen={setOpenRow} />
              ))}
            </>
          ) : null}

          {/* The way in to writing a story nobody sent sits on the run it
              lands in, rather than in the chrome: it is a thing you do to the
              collection, not a thing you do to the desk. */}
          <GroupDivider
            label={`${runs.live.length} ${copy.onSite}`}
            aside={
              <>
                {runs.live.length > visibleLive.length
                  ? copy.showing(visibleLive.length, runs.live.length)
                  : copy.allShown}
                <Sep />
                <Link to="/review/add" className="rv-btn-quiet">
                  {copy.addStory}
                </Link>
              </>
            }
          />

          {/*
            What the wall is doing, in a sentence, with the two presses that
            change which of the two things it is doing. A nullable column only
            reads as a decision if the screen says out loud which state it is in.
          */}
          <div className={`rv-strip${pinned.length ? ' rv-strip--live' : ''}`}>
            <span className="rv-strip-mark">{copy.entriesWall}</span>
            <span>
              {pinned.length
                ? copy.wallPinned(pinned.length, onWall.length)
                : copy.wallAuto(onWall.length)}
            </span>
            <Sep />
            <button
              type="button"
              className="rv-btn-quiet"
              disabled={busy || !onWall.length}
              onClick={pinTheWall}
            >
              {copy.wallPinThese(onWall.length)}
            </button>
            {pinned.length ? (
              <button type="button" className="rv-btn-quiet" disabled={busy} onClick={clearWall}>
                {copy.wallClear}
              </button>
            ) : null}
          </div>

          {visibleLive.map((item) => (
            <Line key={item.key} item={item} copy={copy} email={email} acts={acts} busy={busy}
              pinned={pinned} open={openRow} onOpen={setOpenRow} />
          ))}

          {runs.live.length > visibleLive.length ? (
            <div className="rv-actions">
              <button type="button" className="rv-btn-secondary" onClick={() => setLivePage((n) => n + 1)}>
                {copy.showMore}
              </button>
            </div>
          ) : null}

          {runs.off.length ? (
            <>
              <GroupDivider
                handled
                label={`${runs.off.length} ${copy.notOnSite}`}
                aside={
                  runs.off.length > visibleOff.length
                    ? copy.showing(visibleOff.length, runs.off.length)
                    : copy.allShown
                }
              />
              {visibleOff.map((item) => (
                <Line key={item.key} item={item} copy={copy} email={email} acts={acts} busy={busy}
                  pinned={pinned} open={openRow} onOpen={setOpenRow} />
              ))}

              {runs.off.length > visibleOff.length ? (
                <div className="rv-actions">
                  <button type="button" className="rv-btn-secondary" onClick={() => setOffPage((n) => n + 1)}>
                    {copy.showMore}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </>
  );
}

/** A read or a write that failed while the rest of the screen still works. */
function Half({ detail }: { detail: string }) {
  return (
    <p
      className="rv-failed-detail"
      style={{ borderLeft: '3px solid var(--rv-failed)', padding: '10px 0 10px 14px', marginTop: '20px' }}
    >
      {detail}
    </p>
  );
}

/* ------------------------------------------------------------------- rows */

/**
 * One story in the list.
 *
 * A story nobody published is exactly the row the queue has always drawn, so it
 * is that row — `Row` renders it whole, including the strip that explains why
 * it is not on the site. Only a story that *is* on the site needs the other
 * shape, because only then is there a card to look after.
 */
function Line({
  item,
  copy,
  email,
  acts,
  busy,
  pinned,
  open,
  onOpen,
}: {
  item: StoryItem;
  copy: DeskCopy;
  email: string;
  acts: Acts;
  busy: boolean;
  pinned: string[];
  open: string | null;
  onOpen: (key: string | null) => void;
}) {
  if (!item.entry) {
    return item.sent ? <Row entry={item.sent} copy={copy} onMove={acts.move} /> : null;
  }

  return (
    <Live
      item={item}
      entry={item.entry}
      copy={copy}
      email={email}
      acts={acts}
      busy={busy}
      pinnedAt={isPinned(item.entry) ? pinned.indexOf(item.entry.id) : null}
      pinnedCount={pinned.length}
      open={open === item.key}
      onOpen={(next) => onOpen(next ? item.key : null)}
    />
  );
}

function Live({
  item,
  entry,
  copy,
  email,
  acts,
  busy,
  pinnedAt,
  pinnedCount,
  open,
  onOpen,
}: {
  item: StoryItem;
  /** `item.entry`, narrowed — this component only exists when there is one. */
  entry: EntryRow;
  copy: DeskCopy;
  email: string;
  acts: Acts;
  busy: boolean;
  /** Its index in the pinned run, or null when the date is deciding for it. */
  pinnedAt: number | null;
  pinnedCount: number;
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const [edition, setEdition] = useState<Locale>('en');
  const [draft, setDraft] = useState<EntryEdit>(() => entryEditOf(entry));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [sentOpen, setSentOpen] = useState(false);

  // The row as the database last answered with it — what "unsaved" is measured
  // against, and what Revert goes back to. A reload after a save re-mounts
  // nothing, so this cannot be initial state.
  const saved = useMemo(() => entryEditOf(entry), [entry]);
  const dirty = useMemo(
    () => (Object.keys(saved) as (keyof EntryEdit)[]).some((key) => draft[key] !== saved[key]),
    [draft, saved],
  );

  async function save() {
    setSaving(true);
    const patch: Partial<EntryEdit> = {};
    for (const key of Object.keys(saved) as (keyof EntryEdit)[]) {
      if (draft[key] !== saved[key]) patch[key] = draft[key];
    }

    const error = await saveEntry(entry, patch, email);
    setFailed(error);
    setSaving(false);
    if (!error) acts.reload();
  }

  const en = copyOf(entry.en);
  const taken = entry.edited_at ? entry.edited_at.slice(0, 10) : null;
  const where = entry.hidden ? 'hidden' : entry.draft ? 'draft' : 'live';
  const word = entry.hidden ? copy.entriesHidden : entry.draft ? copy.statusWord.draft : copy.onSite;

  return (
    <article className="rv-row" data-desk-row>
      <div className="rv-rail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span className="rv-label rv-muted">
            {formatDate(entry.published_on, copy.locale) || entry.published_on}
          </span>

          {/*
            Two lines, never one. The first is what was decided in the queue and
            the second is what the site is doing — and the pair coming apart is
            the thing this desk exists to make visible. A story can read
            `Published · Taken off the site`, and that is a real state somebody
            chose, not a contradiction to be tidied away.
          */}
          {item.sent ? <StatusLine status={item.sent.status} copy={copy} /> : null}
          <span className="rv-status rv-label">
            <StatusDot status={where} />
            {word}
          </span>
          {/* Three answers, not two. A card can be pinned and still not on the
              wall — the wall has twelve places and a pin past the twelfth is a
              decision waiting behind them, which is worth saying rather than
              letting "not on the wall" read as "not pinned". */}
          <span className="rv-label rv-quiet">
            {item.place
              ? copy.wallPlace(item.place)
              : isPinned(entry)
                ? copy.wallBehind
                : copy.wallOff}
          </span>
        </div>

        {item.sent ? <Decisions entry={item.sent} copy={copy} onMove={acts.move} /> : null}

        <div className="rv-decisions">
          {entry.hidden ? (
            <button type="button" className="rv-btn" disabled={busy} onClick={() => acts.hide(entry.id, false)}>
              {copy.entryRestore}
            </button>
          ) : (
            <button
              type="button"
              className="rv-btn-secondary"
              disabled={busy}
              onClick={() => acts.hide(entry.id, true)}
            >
              {copy.entryHide}
            </button>
          )}

          {/* The index shows a line above a draft saying a fuller telling is
              still being written. That is a fact about the writing rather than
              about publication, so it is offered either way. */}
          <button
            type="button"
            className="rv-btn-quiet"
            disabled={busy}
            onClick={() => acts.draft(entry, !entry.draft)}
          >
            {entry.draft ? copy.entryFinished : copy.entryDraft}
          </button>

          {entry.hidden ? null : pinnedAt === null ? (
            <button
              type="button"
              className="rv-btn-secondary"
              disabled={busy}
              onClick={() => acts.pin(entry.id)}
            >
              {copy.wallPin}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="rv-btn-secondary"
                disabled={busy}
                onClick={() => acts.unpin(entry.id)}
              >
                {copy.wallUnpin}
              </button>
              {/* The two nudges read as one control, so they share a line
                  rather than making the rail a tower of buttons. */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="rv-btn-quiet"
                  disabled={busy || pinnedAt === 0}
                  onClick={() => acts.nudge(entry.id, -1)}
                >
                  {copy.wallUp}
                </button>
                <button
                  type="button"
                  className="rv-btn-quiet"
                  disabled={busy || pinnedAt >= pinnedCount - 1}
                  onClick={() => acts.nudge(entry.id, 1)}
                >
                  {copy.wallDown}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rv-provenance">
          <span className="rv-mono">/story/{entry.id}</span>
          {item.sent?.sourcePage ? (
            <span className="rv-mono rv-muted">{item.sent.sourcePage}</span>
          ) : null}
        </div>

        {entry.hidden ? null : (
          <a href={`/story/all?story=${entry.id}`} target="_blank" rel="noreferrer">
            {copy.view}
          </a>
        )}

        {/* Which authority this row answers to, said out loud — the same fact
            the news queue states, for the same reason: a reviewer cannot
            otherwise tell whether their edit survives the next extract. */}
        <p className="rv-label rv-quiet" style={{ lineHeight: 1.5 }}>
          {taken
            ? copy.entryTakenOver(formatDate(taken, copy.locale) || taken)
            : copy.entryFromRegister}
        </p>
      </div>

      <div className="rv-reading" style={{ gap: '18px' }}>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
          {/* A row's `image` is whatever was carried across at publish, which
              is sometimes a PDF — see `looksLikeImage`. */}
          {looksLikeImage(entry.image) ? (
            <img className="rv-thumb" src={entry.image ?? ''} alt="" loading="lazy" />
          ) : null}
          <div>
            {en.eyebrow ? <div className="rv-label rv-quiet">{en.eyebrow}</div> : null}
            <h2 className="rv-row-title">{en.title || copy.newsUntitled}</h2>
            <span className="rv-label rv-muted">
              {TAXONOMY.format[entry.format]?.en ?? entry.format}
              <Sep />
              {TAXONOMY.topic[entry.topic]?.en ?? entry.topic}
            </span>
          </div>
        </div>

        {en.body ? <p className="rv-read">{en.body}</p> : null}

        <div className="rv-actions">
          <button type="button" className="rv-btn-quiet" onClick={() => onOpen(!open)}>
            {open ? copy.close : copy.edit}
          </button>
          {/* What the card was made from, folded away. It is the same story, so
              it is on the same row; it is not what the public reads, so it is
              not what the row opens with. */}
          {item.sent ? (
            <button type="button" className="rv-btn-quiet" onClick={() => setSentOpen(!sentOpen)}>
              {sentOpen ? copy.close : copy.sentIn}
            </button>
          ) : null}
          {dirty ? <span className="rv-label rv-note-amber">{copy.unsaved}</span> : null}
        </div>

        {open ? (
          <div className="rv-editor">
            {/* One edition at a time, as the news editor does it: the desk's own
                language control changes the words around a row and never the
                row, so which edition is being written is its own choice, made
                here and visible while typing. */}
            <Select
              label={copy.edition}
              value={edition}
              any={EDITION_LABEL.en}
              options={ENTRY_EDITIONS.filter((value) => value !== 'en').map((value) => ({
                value,
                label: EDITION_LABEL[value],
              }))}
              onChange={(value) => setEdition((value || 'en') as Locale)}
            />

            {WORDS.map((word) => (
              <Words
                key={word}
                word={word}
                edition={edition}
                copy={copy}
                draft={draft}
                onChange={setDraft}
              />
            ))}

            {/*
              The row's own columns, which both editions share. Below the words
              rather than above them because they are the smaller decision: a
              date and two taxonomy keys, where the words are the story.
            */}
            <label className="rv-control">
              <span className="rv-label">{copy.entryDate}</span>
              <input
                className="rv-field"
                type="date"
                value={draft.published_on}
                onChange={(event) => setDraft({ ...draft, published_on: event.target.value })}
              />
            </label>

            <Select
              label={copy.entryTopic}
              value={draft.topic}
              any={draft.topic}
              options={TOPICS.map((value) => ({ value, label: TAXONOMY.topic[value]?.en ?? value }))}
              onChange={(value) => setDraft({ ...draft, topic: value || draft.topic })}
            />

            <Select
              label={copy.format}
              value={draft.format}
              any={draft.format}
              options={FORMATS.map((value) => ({
                value,
                label: TAXONOMY.format[value]?.en ?? value,
              }))}
              onChange={(value) => setDraft({ ...draft, format: value || draft.format })}
            />

            <Picture
              copy={copy}
              url={draft.image}
              onChange={(image) => setDraft({ ...draft, image })}
              onFailed={setFailed}
            />

            {failed ? <p className="rv-failed-detail">{failed}</p> : null}

            <div className="rv-actions">
              <button
                type="button"
                className="rv-btn"
                disabled={!dirty || saving}
                onClick={() => void save()}
              >
                {saving ? copy.saving : copy.save}
              </button>
              <button
                type="button"
                className="rv-btn-secondary"
                disabled={!dirty || saving}
                onClick={() => setDraft(saved)}
              >
                {copy.revert}
              </button>
            </div>
          </div>
        ) : null}

        {sentOpen && item.sent ? (
          <div className="rv-editor">
            {/* Without its own site strip: the rail above already says where
                this story stands, and two answers to that question a few
                centimetres apart is how they start disagreeing. */}
            <StoryBody entry={item.sent} copy={copy} site={false} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ words */

/** In the order a card is read down: the line above, the headline, the rest. */
const WORDS: EntryWord[] = ['eyebrow', 'title', 'body', 'credit', 'paras'];

const LABEL: Record<EntryWord, keyof DeskCopy> = {
  eyebrow: 'entryEyebrow',
  title: 'entryTitle',
  body: 'entryBlurb',
  credit: 'credit',
  paras: 'entryText',
};

function Words({
  word,
  edition,
  copy,
  draft,
  onChange,
}: {
  word: EntryWord;
  edition: Locale;
  copy: DeskCopy;
  draft: EntryEdit;
  onChange: (next: EntryEdit) => void;
}) {
  const column = entryColumn(word, edition);
  const label = `${copy[LABEL[word]] as string} · ${EDITION_LABEL[edition]}`;
  const set = (value: string) => onChange({ ...draft, [column]: value });

  // The blurb is three lines and the full text is the story, so those two are
  // the fields that may grow. `rv-textarea` is vertical-only: a resizable width
  // would break the reading column the desk measures everything to.
  const rows = word === 'paras' ? 12 : word === 'body' ? 3 : 0;

  return (
    <label className="rv-control">
      <span className="rv-label">{label}</span>
      {rows ? (
        <textarea
          className="rv-field rv-textarea"
          rows={rows}
          value={draft[column]}
          onChange={(event) => set(event.target.value)}
        />
      ) : (
        <input
          className="rv-field"
          type="text"
          value={draft[column]}
          onChange={(event) => set(event.target.value)}
        />
      )}
    </label>
  );
}
