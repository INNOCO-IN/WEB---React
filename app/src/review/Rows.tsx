import { Link } from 'react-router-dom';
import {
  BRINGS,
  STATUSES,
  isPreSlug,
  workshopName,
  type IntakeTable,
  type RegistrationRow,
  type StoryRow,
  type SubmissionRow,
} from '../lib/services/review';
import { paragraphs } from '../lib/story-promotion';
import type { DeskCopy } from './copy';
import type { DeskRow } from './filters';
import { Arrived, Provenance, Sep, StatusDot, StatusLine, WriteTo, looksLikeImage } from './parts';

/**
 * One row of a queue: a label rail and a reading column.
 *
 * Not a card. No plate, no rotated rail, no circle arrow — the structure is the
 * same as a printed IN brief, because the job is reading what somebody wrote
 * rather than browsing a collection. The rail carries what the desk knows about
 * the row (when, what status, what can be done, where it came from) and the
 * reading column carries what the person actually sent.
 */

export interface RowProps {
  entry: DeskRow;
  copy: DeskCopy;
  /** Moves the row's status. `stories` never reaches here with `published`. */
  onMove: (id: string, status: string) => void;
  selection?: { on: boolean; selected: boolean; toggle: (id: string) => void };
}

export function Row(props: RowProps) {
  const { entry, selection } = props;

  return (
    <article className="rv-row" data-desk-row>
      <div className="rv-rail">
        {selection?.on ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={selection.selected}
            aria-label={`Select this row`}
            className="rv-check"
            onClick={() => selection.toggle(entry.id)}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Arrived iso={entry.createdAt} copy={props.copy} />
          <StatusLine status={entry.status} copy={props.copy} />
        </div>

        <Decisions {...props} />
        <Provenance edition={entry.edition} path={entry.sourcePage} />
      </div>

      <div className="rv-reading" style={{ gap: '24px' }}>
        {entry.table === 'stories' ? (
          <StoryBody {...props} />
        ) : entry.table === 'submissions' ? (
          <EnquiryBody {...props} />
        ) : (
          <SignupBody {...props} />
        )}
      </div>
    </article>
  );
}

/**
 * The two moves a row offers, which are the two statuses it is not in.
 *
 * Every status is reachable from every other, because nothing is ever deleted
 * and so every decision has to be reversible. `Publish →` is the exception that
 * is not a status write at all: it opens the publishing flow, where the
 * permalink and headline get written. A story becomes `published` there, at the
 * end, or not at all.
 */
export function Decisions({ entry, copy, onMove }: RowProps) {
  const others = STATUSES[entry.table].filter((status) => status !== entry.status);

  return (
    <div className="rv-decisions">
      {others.map((status) => {
        const forward = status === 'published' || status === 'contacted';

        if (entry.table === 'stories' && status === 'published') {
          return (
            <Link key={status} to={`/review/publish/${entry.id}`} className="rv-btn">
              {copy.statusVerb[status]}
            </Link>
          );
        }

        return (
          <button
            key={status}
            type="button"
            className={forward ? 'rv-btn' : 'rv-btn-secondary'}
            onClick={() => onMove(entry.id, status)}
          >
            {copy.statusVerb[status] ?? status}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- stories */

const FORMAT_WORD = (value: string) => value[0].toUpperCase() + value.slice(1);

/**
 * What the visitor sent.
 *
 * `site` is false where the row already says where the story stands — the
 * merged list in `Stories.tsx` puts that in the rail, for a story that is on
 * the site *and* was sent in, and two answers to the same question a few
 * centimetres apart is how they start disagreeing.
 */
export function StoryBody({
  entry,
  copy,
  site = true,
}: Pick<RowProps, 'entry' | 'copy'> & { site?: boolean }) {
  const story = entry.row as StoryRow;
  const paras = paragraphs(story.body);

  return (
    <>
      <div className="rv-meta">
        <Pair label={copy.door} value={story.door} />
        <Pair label={copy.format} value={(story.format ?? []).map(FORMAT_WORD).join(', ')} />
        <Pair label={copy.arc} value={story.arc_stage} />
        {/* A blank credit is the one empty field the desk says out loud: it
            means anonymous, and publishing without knowing that is a mistake. */}
        <Pair label={copy.credit} value={story.credit_name || copy.anonymous} />
        {/* Consent is on every row rather than buried, because a story without
            permission to publish cannot be published and that has to be visible
            before it is read. */}
        {story.consent ? null : <Pair label={copy.consent} value={copy.consentNotGiven} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {paras.slice(0, 3).map((para, index) => (
          <p key={index} className="rv-read">
            {para}
          </p>
        ))}
        {paras.length > 3 ? <Link to={`/review/story/${entry.id}`}>{copy.readInFull}</Link> : null}
      </div>

      <Attachment url={story.attachment_url} copy={copy} />

      {story.email ? (
        <div className="rv-name-line rv-secondary">
          <span className="rv-label rv-muted">{copy.email}</span>
          <span>{story.email}</span>
          <WriteTo email={story.email} name={story.credit_name} copy={copy} />
        </div>
      ) : null}

      {site ? <SiteStrip entry={entry} copy={copy} /> : null}
    </>
  );
}

/**
 * What the public can read, as opposed to what we decided.
 *
 * Two lines that never merge. The status square in the rail is the decision;
 * this is the website. A story can be `Published` and still not on the site —
 * that pair is normal, and the row says so in words rather than leaving a
 * reviewer to remember which of the two a word like "published" meant.
 */

/**
 * Why a story is not on the site, which is a different sentence in each case.
 *
 * `published` with no permalink is the one worth spelling out. It is every row
 * decided before the desk could publish — carried across by
 * `scripts/promote-story.mjs`, or not carried across at all — and the desk
 * genuinely cannot tell those apart: what it knows is that no entry was
 * recorded here. Saying "nothing is published until somebody writes the
 * permalink" would be wrong twice over, since somebody may well have.
 */
function why(status: string): string {
  if (status === 'declined') {
    return 'Declined is a decision, and it stays readable. Nothing is ever removed from this queue.';
  }
  if (status === 'published') {
    return 'Marked published here, but no index entry was recorded — it predates the publishing flow, or was carried across by hand. Publish again to write one.';
  }
  return 'Nothing is published until somebody writes the permalink, headline, topic and summary.';
}
function SiteStrip({ entry, copy }: { entry: DeskRow; copy: DeskCopy }) {
  const story = entry.row as StoryRow;
  const permalink = story.published_as;

  // Declined, but published once: the entry is still in the table, hidden, and
  // that is a third state rather than either line below. "On the site" would be
  // false and link to a page that no longer answers; the bare "not on the site"
  // would lose the part a reviewer actually needs — that the headline, topic
  // and summary somebody wrote are still there to come back to.
  if (permalink && story.status === 'declined') {
    return (
      <div className="rv-strip">
        <span className="rv-strip-mark rv-muted">{copy.notOnSite}</span>
        <span className="rv-mono rv-muted">/story/{permalink}</span>
        <Sep />
        <span className="rv-muted">
          Taken off the index and off the map when this was declined. The entry is kept —
          publishing again restores it, headline and all.
        </span>
      </div>
    );
  }

  if (!permalink) {
    return (
      <div className="rv-strip">
        <span className="rv-strip-mark rv-muted">{copy.notOnSite}</span>
        <span className="rv-muted">{why(story.status)}</span>
      </div>
    );
  }

  return (
    <div className="rv-strip rv-strip--live">
      <span className="rv-strip-mark">{copy.onSite}</span>
      <span className="rv-mono">/story/{permalink}</span>
      <Sep />
      <a href={`/story/all?story=${permalink}`} target="_blank" rel="noreferrer">
        {copy.view}
      </a>
    </div>
  );
}

/**
 * What came with the story.
 *
 * An image is previewed, because deciding often means looking. Video, audio and
 * a PDF link out instead of being embedded — a PDF in particular is not
 * pretended to be an image, which is why the publish screen asks for a plate
 * colour when there is one.
 */
function Attachment({ url, copy, wide }: { url: string | null; copy: DeskCopy; wide?: boolean }) {
  if (!url) return null;

  const name = url.split('/').pop() ?? url;
  const extension = (name.split('.').pop() ?? '').toLowerCase();
  const isImage = looksLikeImage(url);
  const kind = isImage
    ? 'Image · previewed here'
    : ['mp4', 'mov', 'webm'].includes(extension)
      ? 'Video · opens in a new tab'
      : ['mp3', 'wav', 'm4a', 'ogg'].includes(extension)
        ? 'Audio · opens in a new tab'
        : `${extension.toUpperCase() || 'File'} · opens in a new tab`;

  return (
    <div className="rv-attachment">
      {isImage ? (
        <img className={wide ? 'rv-thumb rv-thumb--wide' : 'rv-thumb'} src={url} alt="" loading="lazy" />
      ) : (
        <span className="rv-thumb" aria-hidden="true" />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
        <span className="rv-mono">{name}</span>
        <span className="rv-label rv-muted">{kind}</span>
        <a href={url} target="_blank" rel="noreferrer">
          {copy.openFullSize}
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- enquiries */

function EnquiryBody({ entry, copy }: RowProps) {
  const enquiry = entry.row as SubmissionRow;

  return (
    <>
      {/* An enquiry is from somebody, so the person's name sits where the
          story's door sits, with the address and the reply on the same line. */}
      <div className="rv-name-line">
        <h3 className="rv-row-title">{enquiry.name}</h3>
        <span className="rv-secondary rv-muted">{enquiry.email}</span>
        <WriteTo email={enquiry.email} name={enquiry.name} copy={copy} />
      </div>

      <Brings value={enquiry.brings} copy={copy} />

      {enquiry.message ? (
        <p className="rv-read">{enquiry.message}</p>
      ) : (
        <p className="rv-secondary rv-muted" style={{ fontStyle: 'italic' }}>
          {copy.noMessage}
        </p>
      )}
    </>
  );
}

/**
 * What brings them, as a filled square and a sentence.
 *
 * A row whose `brings` is a whole sentence rather than one of the six slugs
 * arrived before the form stored slugs. It is drawn differently — hollow
 * square, italic, quoted — and left exactly as it arrived, permanently: it is a
 * sentence we were given rather than one of ours, and in whatever language the
 * sender happened to be reading.
 */
function Brings({ value, copy }: { value: string | null; copy: DeskCopy }) {
  if (!value) return null;

  if (isPreSlug(value)) {
    return (
      <div className="rv-status rv-secondary" style={{ fontStyle: 'italic' }}>
        <StatusDot status="" legacy />“{value}”
      </div>
    );
  }

  return (
    <div className="rv-status rv-secondary">
      <StatusDot status="contacted" />
      {BRINGS[copy.locale][value] ?? value}
    </div>
  );
}

/* ---------------------------------------------------------------- signups */

function SignupBody({ entry, copy }: RowProps) {
  const signup = entry.row as RegistrationRow;

  return (
    <>
      <div className="rv-name-line">
        <h3 className="rv-row-title">{signup.name}</h3>
        <span className="rv-secondary rv-muted">{signup.email}</span>
        <WriteTo email={signup.email} name={signup.name} copy={copy} />
      </div>

      {/* Two of the six fields are usually empty. Empty fields are omitted
          rather than rendered as a blank label — a row is as long as what
          somebody actually wrote. `Pair` returns nothing for an empty value. */}
      <div className="rv-meta">
        <Pair label={copy.workshop} value={workshopName(signup.workshop_slug)} />
        <Pair label={copy.organisation} value={signup.org} />
      </div>

      {signup.message ? (
        <p className="rv-read">{signup.message}</p>
      ) : (
        <p className="rv-secondary rv-muted" style={{ fontStyle: 'italic' }}>
          {copy.noMessage}
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ parts */

function Pair({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="rv-pair">
      <span className="rv-label">{label}</span>
      <span className="rv-pair-value">{value}</span>
    </div>
  );
}

export { Attachment, Pair };
export type { IntakeTable };
