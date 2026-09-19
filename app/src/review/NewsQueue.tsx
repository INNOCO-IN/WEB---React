import { useMemo, useState } from 'react';
import {
  EDITIONS,
  EDITION_LABEL,
  NEWS_FIELDS,
  NEWS_STATUSES,
  newsColumn,
  newsEditOf,
  saveNews,
  type NewsEdit,
  type NewsField,
  type NewsRow,
  type NewsStatus,
} from '../lib/services/review';
import { formatDate } from '../lib/format';
import type { Locale } from '../i18n/locales';
import type { DeskCopy } from './copy';
import { Select, StatusLine } from './parts';
import { Empty, Failed, Reading } from './States';

/**
 * The news queue — the one queue the desk writes rather than moves.
 *
 * It is a separate component from `Queue` on purpose. The three intake queues
 * share a filter bar because they share a shape: a row arrived on a date, in an
 * edition, from a page, and is waiting on somebody. A news item has none of
 * those facts. It has a publication date the register chose, three editions at
 * once rather than one, and a status that says where it is rather than whether
 * anybody has dealt with it. Putting it through `applyFilters` would have meant
 * four queues sharing a vocabulary that fits three of them, and a Language
 * filter that reads as "which edition" on three tabs and means nothing on the
 * fourth.
 *
 * What it does share is the chrome: the tab rail, the search box and the words,
 * all of which live above it in `Desk`.
 */

export interface NewsQueueProps {
  rows: NewsRow[];
  copy: DeskCopy;
  loading: boolean;
  error: string | null;
  reload: () => void;
  onSignIn: () => void;
  /** The signed-in address, stamped onto `edited_by` by every write. */
  email: string;
  /** Typed in the chrome, read here — see the note on the field in Desk.tsx. */
  search: string;
}

export default function NewsQueue({
  rows,
  copy,
  loading,
  error,
  reload,
  onSignIn,
  email,
  search,
}: NewsQueueProps) {
  const [status, setStatus] = useState('');
  const [openRow, setOpenRow] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!needle) return true;

      // Every edition is searched, not the one on screen. Somebody looking for
      // a Korean headline should find it from a desk set to English, because
      // what they are looking for is the item and not the edition.
      const haystack = [
        row.id,
        row.kind,
        row.eyebrow,
        row.title,
        row.body,
        row.kind_ko,
        row.eyebrow_ko,
        row.title_ko,
        row.body_ko,
        row.kind_zh_tw,
        row.eyebrow_zh_tw,
        row.title_zh_tw,
        row.body_zh_tw,
        ...(row.feeds ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [rows, status, search]);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const row of rows) tally[row.status] = (tally[row.status] ?? 0) + 1;
    return tally;
  }, [rows]);

  if (loading) return <Reading copy={copy} />;
  if (error) {
    return <Failed copy={copy} detail={error} onRetry={reload} onSignIn={onSignIn} />;
  }
  if (!rows.length) return <Empty>{copy.empty.news}</Empty>;

  return (
    <>
      <div className="rv-filters">
        <Select
          label={copy.newsStatus}
          value={status}
          any={copy.newsAnyStatus}
          options={NEWS_STATUSES.map((value) => ({
            value,
            label: copy.statusWord[value] ?? value,
            count: counts[value] ?? 0,
          }))}
          onChange={setStatus}
        />
      </div>

      {shown.length ? (
        shown.map((row) => (
          <NewsItem
            key={row.id}
            row={row}
            copy={copy}
            email={email}
            open={openRow === row.id}
            onOpen={(next) => setOpenRow(next ? row.id : null)}
            onSaved={reload}
          />
        ))
      ) : (
        <Empty>{copy.newsNarrowed}</Empty>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- item */

function NewsItem({
  row,
  copy,
  email,
  open,
  onOpen,
  onSaved,
}: {
  row: NewsRow;
  copy: DeskCopy;
  email: string;
  open: boolean;
  onOpen: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [edition, setEdition] = useState<Locale>('en');
  const [draft, setDraft] = useState<NewsEdit>(() => newsEditOf(row));
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  // The row as the database last answered with it. A reload after a save
  // re-mounts nothing, so `saved` is what "unsaved changes" is measured
  // against and what Revert goes back to.
  const saved = useMemo(() => newsEditOf(row), [row]);
  const dirty = useMemo(
    () => (Object.keys(saved) as (keyof NewsEdit)[]).some((key) => draft[key] !== saved[key]),
    [draft, saved],
  );

  async function move(next: NewsStatus) {
    setSaving(true);
    setWriteError(await saveNews(row.id, { status: next }, email));
    setSaving(false);
    onSaved();
  }

  async function save() {
    setSaving(true);
    const patch: Partial<NewsEdit> = {};
    for (const key of Object.keys(saved) as (keyof NewsEdit)[]) {
      if (draft[key] !== saved[key]) patch[key] = draft[key];
    }
    const failed = await saveNews(row.id, patch, email);
    setWriteError(failed);
    setSaving(false);
    if (!failed) onSaved();
  }

  const day = row.published_at ?? '';
  const taken = row.edited_at ? row.edited_at.slice(0, 10) : null;

  return (
    <article className="rv-row" data-desk-row>
      <div className="rv-rail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span className="rv-label rv-muted">{formatDate(day, copy.locale) || day}</span>
          <StatusLine status={row.status} copy={copy} />
        </div>

        {/*
          The two statuses this item is not in. Same rule as the intake queues:
          every status is reachable from every other, because nothing is deleted
          and so every move has to be reversible.
        */}
        <div className="rv-decisions">
          {NEWS_STATUSES.filter((value) => value !== row.status).map((value) => (
            <button
              key={value}
              type="button"
              className={value === 'live' ? 'rv-btn' : 'rv-btn-secondary'}
              disabled={saving}
              onClick={() => void move(value)}
            >
              {copy.statusVerb[value] ?? value}
            </button>
          ))}
        </div>

        <div className="rv-provenance">
          <span className="rv-mono">{row.id}</span>
        </div>

        {/*
          Which authority this row answers to, said out loud.

          It is the one fact about a news item that nothing else on the page
          could reveal: an item the desk has written is no longer overwritten by
          `site/data`, and an item it has not still is. Silence here would mean a
          reviewer could not tell whether their edit was going to survive the
          next extract — which is exactly the failure `edited_at` exists to
          prevent. See the migration 20260919104500_staff_edit_news.sql.
        */}
        <p className="rv-label rv-quiet" style={{ lineHeight: 1.5 }}>
          {taken ? copy.newsTakenOver(formatDate(taken, copy.locale) || taken) : copy.newsFromRegister}
        </p>
      </div>

      <div className="rv-reading" style={{ gap: '18px' }}>
        <div>
          {row.eyebrow ? <div className="rv-label rv-quiet">{row.eyebrow}</div> : null}
          <h2 className="rv-row-title">{row.title}</h2>
          {row.kind ? <span className="rv-label rv-muted">{row.kind}</span> : null}
        </div>

        {row.body ? <p className="rv-read">{row.body}</p> : null}

        <div className="rv-actions">
          <button type="button" className="rv-btn-quiet" onClick={() => onOpen(!open)}>
            {open ? copy.close : copy.edit}
          </button>
          {dirty ? <span className="rv-label rv-note-amber">{copy.unsaved}</span> : null}
        </div>

        {open ? (
          <div className="rv-editor">
            {/*
              One edition at a time. The desk's own language control changes the
              words around a row and never the row — so which edition is being
              written has to be its own choice, made here, visible while typing.
            */}
            <Select
              label={copy.edition}
              value={edition}
              any={EDITION_LABEL.en}
              options={EDITIONS.filter((value) => value !== 'en').map((value) => ({
                value,
                label: EDITION_LABEL[value],
              }))}
              onChange={(value) => setEdition((value || 'en') as Locale)}
            />

            {NEWS_FIELDS.map((field) => (
              <EditorField
                key={field}
                field={field}
                edition={edition}
                copy={copy}
                draft={draft}
                onChange={setDraft}
              />
            ))}

            {writeError ? <p className="rv-failed-detail">{writeError}</p> : null}

            <div className="rv-actions">
              <button type="button" className="rv-btn" disabled={!dirty || saving} onClick={() => void save()}>
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
      </div>
    </article>
  );
}

const LABEL: Record<NewsField, keyof DeskCopy> = {
  kind: 'newsKind',
  eyebrow: 'newsEyebrow',
  title: 'newsTitle',
  body: 'newsBody',
};

function EditorField({
  field,
  edition,
  copy,
  draft,
  onChange,
}: {
  field: NewsField;
  edition: Locale;
  copy: DeskCopy;
  draft: NewsEdit;
  onChange: (next: NewsEdit) => void;
}) {
  const column = newsColumn(field, edition);
  const label = `${copy[LABEL[field]] as string} · ${EDITION_LABEL[edition]}`;
  const set = (value: string) => onChange({ ...draft, [column]: value });

  return (
    <label className="rv-control">
      <span className="rv-label">{label}</span>
      {field === 'body' ? (
        <textarea
          className="rv-field rv-textarea"
          rows={4}
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
