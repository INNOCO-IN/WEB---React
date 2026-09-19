import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { declineStory, fetchStory, type StoryRow } from '../lib/services/review';
import { editionOf } from '../lib/services/review';
import { paragraphs } from '../lib/story-promotion';
import { useDeskCopy, type DeskCopy } from './copy';
import { Arrived, Provenance, StatusLine, WriteTo } from './parts';
import { Attachment, Pair } from './Rows';
import { Failed, Reading } from './States';

/**
 * One submission, read on its own.
 *
 * The queue is for triage at a glance; this is where somebody actually reads
 * it. The body is at reading size in full, the attachment is at reading width
 * rather than as a thumbnail — deciding often means looking — and the metadata
 * moves into a label rail so the text has the column to itself.
 *
 * **The door as title.** A submission has no headline, and this view does not
 * invent one: the door the person chose sits where a title would, at display
 * size, because it is theirs and not ours. The headline gets written at
 * publish, and not before.
 */

export default function StoryView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { copy } = useDeskCopy();

  const [row, setRow] = useState<StoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchStory(id).then((result) => {
      if (cancelled) return;
      setRow(result.row);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The only decision this view writes: publishing is a screen of its own,
  // reached by the link beside this button. Declining takes the story off the
  // index and off the map when it was on them, which is why it needs the row
  // rather than the id — see `declineStory`.
  async function decline(story: StoryRow) {
    const failed = await declineStory(story);
    if (failed) setError(failed);
    else navigate('/review?queue=stories');
  }

  if (loading) {
    return (
      <Frame copy={copy}>
        <Reading copy={copy} />
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame copy={copy}>
        <Failed
          copy={copy}
          detail={error}
          onRetry={() => navigate(0)}
          onSignIn={() => navigate('/review')}
        />
      </Frame>
    );
  }

  if (!row) {
    return (
      <Frame copy={copy}>
        <p className="rv-read">That submission is not in the queue.</p>
      </Frame>
    );
  }

  const paras = paragraphs(row.body);

  return (
    <Frame copy={copy}>
      <div className="rv-row" style={{ borderBottom: 0 }}>
        <div className="rv-rail">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Arrived iso={row.created_at} copy={copy} />
            <StatusLine status={row.status} copy={copy} />
          </div>

          <div className="rv-decisions">
            <Link to={`/review/publish/${row.id}`} className="rv-btn">
              {copy.statusVerb.published}
            </Link>
            <button type="button" className="rv-btn-secondary" onClick={() => void decline(row)}>
              {copy.statusVerb.declined}
            </button>
          </div>

          <Pair label={copy.format} value={(row.format ?? []).map((f) => f[0].toUpperCase() + f.slice(1)).join(', ')} />
          <Pair label={copy.arc} value={row.arc_stage} />
          <Pair label={copy.credit} value={row.credit_name || copy.anonymous} />
          {row.consent ? null : <Pair label={copy.consent} value={copy.consentNotGiven} />}

          <Provenance edition={editionOf(row.source_page)} path={row.source_page} />

          {row.email ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="rv-label rv-muted">{copy.email}</span>
              <span className="rv-secondary">{row.email}</span>
              {/* The desk hands over to the mail client and stops. It does not
                  try to own correspondence it cannot see the rest of. */}
              <WriteTo email={row.email} name={row.credit_name} copy={copy} />
            </div>
          ) : null}
        </div>

        <div className="rv-reading" style={{ gap: '28px' }}>
          <div>
            {/* The board's sample reads "She came in through the door marked",
                which is true of that one row and of nothing else: the form has
                never asked, and most rows have no name on them at all. */}
            <span className="rv-label rv-muted">Came in through the door marked</span>
            <h1 className="rv-title" style={{ paddingTop: '10px' }}>
              {row.door ?? 'no door given'}
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {paras.map((para, index) => (
              <p key={index} className="rv-read">
                {para}
              </p>
            ))}
          </div>

          {row.attachment_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="rv-label rv-muted">Sent with the story</span>
              <Attachment url={row.attachment_url} copy={copy} wide />
            </div>
          ) : null}

          <div className="rv-strip">
            <span className="rv-strip-mark rv-muted">{copy.notOnSite}</span>
            <span className="rv-muted">
              Publishing writes the permalink, headline, topic and summary — none of which this submission
              contains.
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Frame({ children, copy }: { children: React.ReactNode; copy: DeskCopy }) {
  return (
    <div className="rv-page">
      <div className="rv-panel" style={{ paddingBottom: '36px' }}>
        <header className="rv-panel-head">
          <div>
            <span className="rv-label rv-eyebrow">{copy.eyebrow}</span>
            <h1 className="rv-title">{copy.title}</h1>
          </div>
          <Link to="/review?queue=stories" className="rv-btn-quiet">
            {copy.backToQueue}
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
