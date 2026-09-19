import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/format';
import { EDITION_LABEL, uploadPicture } from '../lib/services/review';
import type { Locale } from '../i18n/locales';
import type { DeskCopy } from './copy';

/**
 * The marks the desk is drawn with.
 *
 * There are no assets in this tool — no images, no icons, no logo. Every mark
 * is a `div`: the status squares, the hairlines, the hatched placeholder behind
 * an attachment that has not loaded. These are those marks, so that a row, a
 * reading view and a publishing screen cannot each grow their own version of
 * the same square.
 */

/* ---------------------------------------------------------------- status */

/**
 * Teal is new, ink is decided, grey is archived — with the word, never alone.
 *
 * `hidden` is not a status any column holds: it is the story-entry queue's
 * third state, a row still in the table and no longer served. It takes the
 * archived grey because that is the same thing said about a different table —
 * kept, not shown.
 */
function dotKind(status: string): string {
  if (status === 'new' || status === 'pending') return 'new';
  if (status === 'archived' || status === 'hidden') return 'archived';
  return 'decided';
}

export function StatusDot({ status, legacy }: { status: string; legacy?: boolean }) {
  return <span className={`rv-dot rv-dot--${legacy ? 'legacy' : dotKind(status)}`} aria-hidden="true" />;
}

export function StatusLine({ status, copy }: { status: string; copy: DeskCopy }) {
  return (
    <span className="rv-status rv-label">
      <StatusDot status={status} />
      {/* The column's own value is the fallback. A status the desk has no word
          for is a vocabulary that has drifted from the database, and showing it
          raw says so; showing nothing would hide it. */}
      {copy.statusWord[status] ?? status}
    </span>
  );
}

/**
 * Whether a URL is something an `<img>` can draw.
 *
 * By extension, because that is all the desk has — these are storage URLs and
 * nothing here has the content type. It matters because the column it is asked
 * about is not always a picture: a story's `image` is the attachment the
 * visitor sent, carried across at publish, and some of those are PDFs. An
 * `<img>` pointed at one draws a broken image, which reads as a fault in the
 * desk rather than as a fact about the row.
 */
export function looksLikeImage(url: string | null | undefined): boolean {
  const name = String(url ?? '').split('/').pop() ?? '';
  const extension = (name.split('.').pop() ?? '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(extension);
}

/* ---------------------------------------------------------------- fields */

/**
 * A labelled value, or nothing at all.
 *
 * Empty fields are omitted rather than rendered as a blank label: two of the
 * six sign-up fields are usually empty, and a row should be as long as what
 * somebody actually wrote. The single exception is a missing story credit,
 * which means anonymous and so has to be said — the caller passes the words for
 * that rather than an empty string.
 */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div>
      <div className="rv-label rv-quiet" style={{ marginBottom: '6px' }}>
        {label}
      </div>
      <div className="rv-secondary">{value}</div>
    </div>
  );
}

/**
 * The date a row arrived, as the rail prints it.
 *
 * In the desk's language, not the site's default: `12 September 2026` reading
 * as `2026年9月12日` for somebody who set the desk to Chinese is the same fact
 * said in the language around it, and an English month name in an otherwise
 * Chinese rail is the sort of thing that reads as a half-finished translation.
 * The ISO string is the fallback, so a date the formatter cannot parse is shown
 * rather than swallowed.
 */
export function Arrived({ iso, copy }: { iso: string; copy: DeskCopy }) {
  const day = iso.slice(0, 10);
  return <span className="rv-label rv-muted">{formatDate(day, copy.locale) || day}</span>;
}

/**
 * Where a row came from, and which edition it was written in.
 *
 * The tag sits directly above the path because that is the whole reason it is
 * there: the reply has to go back in the language the person wrote in, and the
 * path is what says which that was.
 */
export function Provenance({ edition, path }: { edition: Locale; path: string | null }) {
  if (!path) return null;

  return (
    <div className="rv-provenance">
      <span className="rv-label rv-edition">{EDITION_LABEL[edition]}</span>
      <span className="rv-mono">{path}</span>
    </div>
  );
}

/**
 * Hands the reply over to the mail client and stops.
 *
 * The desk does not try to own correspondence it cannot see the rest of, so
 * there is no compose window here and no record of what was sent — pressing
 * "Contacted" afterwards is a person saying they did it.
 */
export function WriteTo({
  email,
  name,
  copy,
}: {
  email: string | null;
  name?: string | null;
  copy: DeskCopy;
}) {
  if (!email) return null;
  const first = String(name ?? '').trim().split(/\s+/)[0] ?? '';

  return <a href={`mailto:${email}`}>{copy.writeTo(first)}</a>;
}

/* ---------------------------------------------------------------- controls */

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="rv-control">
      <span className="rv-label">{label}</span>
      <div className="rv-segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Select({
  label,
  value,
  any,
  options,
  onChange,
}: {
  label: string;
  value: string;
  any: string;
  options: { value: string; label: string; count?: number }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="rv-control">
      <span className="rv-label">{label}</span>
      <select className="rv-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{any}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.count === undefined ? option.label : `${option.label} · ${option.count}`}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The heading over a run of rows, with its count and a rule to the margin.
 *
 * The count is always stated: "7 waiting · 333 handled" tells a reviewer the
 * size of the job before they scroll.
 */
export function GroupDivider({
  label,
  handled,
  aside,
}: {
  label: string;
  handled?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div className={`rv-group${handled ? ' rv-group--handled' : ''}`}>
      <span className="rv-label-strong">{label}</span>
      <span className="rv-group-rule" />
      {aside ? <span className="rv-label rv-quiet">{aside}</span> : null}
    </div>
  );
}

/** A dot between two facts on one line. */
export function Sep() {
  return <span className="rv-sep">·</span>;
}

/* ------------------------------------------------------------- a screen */

/** The plate colours a story with no image can be given. */
export const PLATES = [
  { value: '#1E648C', label: 'Deep blue' },
  { value: '#E6328C', label: 'Magenta' },
  { value: '#46325A', label: 'Plum' },
  { value: '#3C8246', label: 'Green' },
  { value: '#F0D23C', label: 'Yellow' },
  { value: '#1E5A64', label: 'Slate' },
];

/*
 * The chrome and the fields of a full-page screen, shared by the two the desk
 * has: publishing a submission, and writing a story from nothing. They were
 * `Publish`'s own until the second screen wanted the same page around the same
 * kind of question — and two copies of a form field is how one screen quietly
 * grows a border the other does not have.
 */

export function Frame({ children, copy }: { children: ReactNode; copy: { title: string; eyebrow: string } }) {
  return (
    <div className="rv-page">
      <div className="rv-panel" style={{ paddingBottom: '36px' }}>
        <header className="rv-panel-head">
          <div>
            <span className="rv-label rv-eyebrow">{copy.eyebrow}</span>
            <h1 className="rv-title">{copy.title}</h1>
          </div>
          <Link to="/review?queue=stories" className="rv-btn-quiet">
            ← Back to the queue
          </Link>
        </header>
        <div style={{ paddingTop: '36px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="rv-step">
      <h2 className="rv-label-strong">
        {n} · {title}
      </h2>
      {children}
    </section>
  );
}

export function Text({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="rv-control">
      {label ? <span className="rv-label rv-quiet">{label}</span> : null}
      <input className="rv-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function Area({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) {
  return (
    <label className="rv-control">
      {label ? <span className="rv-label rv-quiet">{label}</span> : null}
      <textarea
        className="rv-field"
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ resize: 'vertical', lineHeight: 1.5 }}
      />
    </label>
  );
}

export function Choices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rv-choices">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="rv-choice"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- picture */

/**
 * The card's picture: what it is now, the address it lives at, and a way to
 * put a new one there.
 *
 * The address is editable because half the collection points at a file in
 * `public/story-img` that no upload put there, and because a picture is
 * sometimes moved rather than replaced. The upload is here because the other
 * half came out of the `story-media` bucket, and asking a reviewer to find a
 * URL for a file they are holding is asking them to do the bucket's job.
 *
 * The preview is the part that matters. `image` is a column with a string in
 * it: without a picture on the screen, a wrong address and a right one look
 * exactly the same, and the mistake only surfaces on the site.
 */
export function Picture({
  copy,
  url,
  onChange,
  onFailed,
}: {
  copy: DeskCopy;
  url: string;
  onChange: (url: string) => void;
  onFailed: (error: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function take(file: File | undefined) {
    if (!file) return;

    setBusy(true);
    const { url: next, error } = await uploadPicture(file);
    setBusy(false);
    onFailed(error);
    if (next) onChange(next);
  }

  return (
    <div className="rv-control">
      <span className="rv-label">{copy.entryImage}</span>

      {looksLikeImage(url) ? (
        <img className="rv-thumb rv-thumb--wide" src={url} alt="" />
      ) : (
        <span className="rv-label rv-quiet">{url ? url : copy.entryNoPicture}</span>
      )}

      <input
        className="rv-field"
        type="text"
        value={url}
        onChange={(event) => onChange(event.target.value)}
      />

      <span className="rv-label rv-quiet">{busy ? copy.entryUploading : copy.entryUpload}</span>
      <input
        className="rv-field"
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(event) => {
          void take(event.target.files?.[0]);
          // Cleared so choosing the same file twice still counts as a change,
          // which is what a retry after a failed upload looks like.
          event.target.value = '';
        }}
      />
    </div>
  );
}
