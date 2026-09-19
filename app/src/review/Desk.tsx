import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { signOut } from '../lib/auth';
import { watchTable } from '../lib/services/realtime';
import {
  fetchEntries,
  fetchIntake,
  fetchNewsQueue,
  isStaff,
  type EntryRow,
  type IntakeRow,
  type IntakeTable,
  type NewsRow,
} from '../lib/services/review';
import { DESK_LOCALES, useDeskCopy, type DeskLocale } from './copy';
import { HTML_LANG, LOCALE_NAMES } from '../i18n/locales';
import { toDeskRow, type DeskRow } from './filters';
import Queue from './Queue';
import NewsQueue from './NewsQueue';
import StoryQueue from './StoryQueue';
import { Ambiguous, Reading } from './States';

/**
 * The desk: four queues, the chrome around them, and what is in each.
 *
 * There is no product navigation. Nothing links into this and nothing links out
 * of it — the tab rail switches queues and that is the whole of it. The counts
 * beside the tab names are the only ambient signal in the tool, and they are
 * the one thing a single merged stream would have done better, which is why
 * every queue is read on load rather than only the one being looked at.
 *
 * Three of the four are intake: rows visitors sent, which the desk reads and
 * moves. The fourth is `news`, which the site publishes and the desk *edits* —
 * a different verb, a different shape, and so a queue component of its own. The
 * rail, the search box and the words are what they share.
 *
 * The stories tab is the exception to "one queue, one table". It reads two —
 * what visitors sent and what the site is serving — and shows them as one list,
 * because they are one job and mostly the same stories. `StoryQueue` joins
 * them; this file only hands it both reads and a reload that refreshes both.
 */

const INTAKE: IntakeTable[] = ['stories', 'submissions', 'workshop_registrations'];

/** Every tab in rail order. News last: it is the one nobody is waiting on. */
type DeskTable = IntakeTable | 'news';
const TABS: DeskTable[] = [...INTAKE, 'news'];

/** `?queue=submissions` — so a reload, or a link to somebody, lands where it was. */
const TAB_PARAM: Record<string, DeskTable> = {
  stories: 'stories',
  enquiries: 'submissions',
  signups: 'workshop_registrations',
  news: 'news',
};
const TAB_SLUG: Record<DeskTable, string> = {
  stories: 'stories',
  submissions: 'enquiries',
  workshop_registrations: 'signups',
  news: 'news',
};

interface QueueState {
  rows: DeskRow[];
  error: string | null;
  loading: boolean;
}

/** The news queue holds its rows raw: it has its own filters and its own row. */
interface NewsState {
  rows: NewsRow[];
  error: string | null;
  loading: boolean;
}

/** So does the story collection, and for the same reason. */
interface EntriesState {
  rows: EntryRow[];
  error: string | null;
  loading: boolean;
}

const BLANK: QueueState = { rows: [], error: null, loading: true };
const BLANK_NEWS: NewsState = { rows: [], error: null, loading: true };
const BLANK_ENTRIES: EntriesState = { rows: [], error: null, loading: true };

export default function Desk({ email }: { email: string }) {
  const [params, setParams] = useSearchParams();
  const [staff, setStaff] = useState<boolean | null>(null);
  const [queues, setQueues] = useState<Record<IntakeTable, QueueState>>({
    stories: BLANK,
    submissions: BLANK,
    workshop_registrations: BLANK,
  });
  const [news, setNews] = useState<NewsState>(BLANK_NEWS);
  const [entries, setEntries] = useState<EntriesState>(BLANK_ENTRIES);

  const { copy, locale, setLocale } = useDeskCopy();
  const tab = TAB_PARAM[params.get('queue') ?? ''] ?? 'stories';
  const search = params.get('q') ?? '';

  const setSearch = useCallback(
    (value: string) => {
      const next: Record<string, string> = { queue: TAB_SLUG[tab] };
      if (value) next.q = value;
      setParams(next, { replace: true });
    },
    [tab, setParams],
  );

  const setTab = useCallback(
    (next: DeskTable) => {
      // The search text belongs to the queue it was typed in. Carrying
      // "kathmandu" onto the sign-ups tab would narrow it to nothing and read
      // as an empty queue rather than as a filter left on.
      setParams({ queue: TAB_SLUG[next] }, { replace: true });
    },
    [setParams],
  );

  // The clock, read once per mount rather than per render: "this year" and
  // "30 days" have to answer the same question for every row in one pass.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = useCallback(async (table: IntakeTable) => {
    const result = await fetchIntake<IntakeRow>(table);
    setQueues((current) => ({
      ...current,
      [table]: {
        rows: result.rows.map((row) => toDeskRow(table, row)),
        error: result.error,
        loading: false,
      },
    }));
  }, []);

  const loadNews = useCallback(async () => {
    const result = await fetchNewsQueue();
    setNews({ rows: result.rows, error: result.error, loading: false });
  }, []);

  const loadEntries = useCallback(async () => {
    const result = await fetchEntries();
    setEntries({ rows: result.rows, error: result.error, loading: false });
  }, []);

  useEffect(() => {
    void isStaff().then(setStaff);
    for (const table of INTAKE) void load(table);
    void loadNews();
    void loadEntries();
  }, [load, loadNews, loadEntries]);

  /**
   * The desk is left open.
   *
   * Somebody opens it, reads a row, writes a reply, and comes back to the tab
   * an hour later — by which time the counts in the rail are a claim about when
   * the page loaded rather than about the queue. The site's own subscription
   * layer already does this for the content tables and the intake tables are in
   * its list, so the desk gets the same behaviour for the cost of three calls:
   * a change means refetch, not patch.
   */
  useEffect(() => {
    const stops = [
      ...INTAKE.map((table) => watchTable(table, () => void load(table))),
      // News is edited from this very desk, so the subscription is also what
      // keeps two reviewers with the tab open from overwriting each other's
      // work without ever seeing it happen.
      watchTable('news', () => void loadNews()),
      // And the collection, which is written from three places rather than
      // two: this desk, the publishing screen, and `promote-watch` in a
      // terminal. Publishing a story puts it in the list while somebody is
      // looking at the list.
      watchTable('story_entries', () => void loadEntries()),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  }, [load, loadNews, loadEntries]);

  const anyLoading =
    INTAKE.some((table) => queues[table].loading) || news.loading || entries.loading;

  return (
    <div className="rv-page">
      <div className="rv-panel">
        <header className="rv-panel-head">
          <div>
            <span className="rv-label rv-eyebrow">{copy.eyebrow}</span>
            <h1 className="rv-title">{copy.title}</h1>
          </div>

          <div className="rv-whoami">
            {/*
              The chrome switches language; the rows do not. A submission is
              read in the language it was written in.

              Each language in its own name, from the site's own table — the
              switcher on the public pages lists them the same way. That also
              keeps this visibly apart from the Language *filter* below, which
              spells its options `EN · KO · ZH-TW` because those are the tags on
              the rows. Two controls with the word "Korean" in them would invite
              the reading that this one narrows the queue, and it does not: it
              changes the words around the queue and nothing in it.
            */}
            <select
              className="rv-select rv-select--chrome"
              aria-label={copy.deskLanguage}
              value={locale}
              onChange={(event) => setLocale(event.target.value as DeskLocale)}
            >
              {DESK_LOCALES.map((option) => (
                <option key={option} value={option} lang={HTML_LANG[option]}>
                  {LOCALE_NAMES[option]}
                </option>
              ))}
            </select>
            <span className="rv-label">{email}</span>
            <button type="button" className="rv-btn-quiet" onClick={() => void signOut()}>
              {copy.signOut}
            </button>
          </div>
        </header>

        {/*
          Signed in, and nothing readable. Two causes that look identical from
          here, so no tabs and no counts above it either — there is nothing to
          count, and a rail of three zeroes would read as three empty queues
          rather than as a desk that cannot see them.
        */}
        {staff === false && !anyLoading ? (
          <Ambiguous email={email} />
        ) : staff === null && anyLoading ? (
          <Reading copy={copy} />
        ) : (
          <>
            <div className="rv-tabs">
              <div className="rv-tab-rail">
                {TABS.map((table) => (
                  <button
                    key={table}
                    type="button"
                    className="rv-tab"
                    aria-current={tab === table}
                    onClick={() => setTab(table)}
                  >
                    <span className="rv-label-strong">{copy.tabs[table]}</span>
                    {table === 'news' ? <NewsCount state={news} /> : <Count state={queues[table]} />}
                  </button>
                ))}
              </div>

              {/*
                The search field is drawn in the chrome and read by the queue,
                so the text lives here and the narrowing happens there. It is in
                the URL because a reviewer who finds the row they were looking
                for and reloads should still be looking at it.
              */}
              <input
                className="rv-field rv-search"
                type="search"
                placeholder={copy.search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {tab === 'stories' ? (
              <StoryQueue
                sent={queues.stories.rows}
                entries={entries.rows}
                copy={copy}
                loading={queues.stories.loading || entries.loading}
                sentError={queues.stories.error}
                entriesError={entries.error}
                reload={() => {
                  void load('stories');
                  void loadEntries();
                }}
                onSignIn={() => void signOut()}
                email={email}
                today={today}
                search={search}
                onSearch={setSearch}
              />
            ) : tab === 'news' ? (
              <NewsQueue
                rows={news.rows}
                copy={copy}
                loading={news.loading}
                error={news.error}
                reload={() => void loadNews()}
                onSignIn={() => void signOut()}
                email={email}
                search={search}
              />
            ) : (
              <Queue
                key={tab}
                table={tab}
                rows={queues[tab].rows}
                copy={copy}
                loading={queues[tab].loading}
                error={queues[tab].error}
                reload={() => void load(tab)}
                onSignIn={() => void signOut()}
                today={today}
                search={search}
                onSearch={setSearch}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * How many are waiting in a queue you are not looking at.
 *
 * Waiting, not total: the number is there to say whether there is something to
 * do. A queue that failed to read shows nothing rather than a zero, because a
 * zero is a claim and this does not have one to make.
 */
function Count({ state }: { state: QueueState }) {
  if (state.loading || state.error) return null;
  const waiting = state.rows.filter((row) => row.waiting).length;
  return <span className="rv-count">{waiting}</span>;
}

/**
 * The same number for news, counting the same thing: what is not decided yet.
 *
 * A draft is an item written and not put live, which is the only state here
 * anybody is expected to act on. `live` and `archived` are both settled, so
 * neither is counted — a rail that said "18" beside News every day would be
 * reporting the size of the table rather than the size of the job.
 */
function NewsCount({ state }: { state: NewsState }) {
  if (state.loading || state.error) return null;
  const drafts = state.rows.filter((row) => row.status === 'draft').length;
  return <span className="rv-count">{drafts}</span>;
}
