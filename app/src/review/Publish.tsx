import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TAXONOMY } from '../lib/content/stories';
import { formatDate } from '../lib/format';
import {
  fetchStory,
  permalinkTaken,
  pinCount,
  publishStory,
  type StoryRow,
} from '../lib/services/review';
import {
  ARCS,
  FORMATS,
  TOPICS,
  formatOf,
  paragraphs,
  slugify,
  titleFrom,
  topicFor,
} from '../lib/story-promotion';
import { WALL_CARDS } from '../lib/story-wall';
import { useDeskCopy } from './copy';
import { Area, Choices, Frame, PLATES, Step, Text } from './parts';
import { Failed, Reading } from './States';

/**
 * Publishing: writing the half a submission does not contain.
 *
 * Not a settings form, and not a wizard. The story stays open on the left at
 * reading size the whole way down and the decisions sit on the right, because
 * the permalink and the summary are decided by the same reading and paging
 * between them loses the story. One screen, one sitting — then one last look.
 *
 * Five decisions, each asked as a sentence rather than labelled as a field: a
 * reviewer here is making editorial calls about something they have just read,
 * not completing a record. Everything is derived to a sensible default first,
 * out loud, so the work is correcting a guess rather than filling in a blank.
 */

interface Draft {
  slug: string;
  title: string;
  topic: string;
  format: string;
  context: string;
  date: string;
  blurb: string;
  color: string;
  koTitle: string;
  koBlurb: string;
  koBody: string;
  constellation: boolean;
  arc: string;
}

export default function Publish() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { copy } = useDeskCopy();

  const [row, setRow] = useState<StoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  /** How many of the wall's twelve places are spoken for — see `WallNote`. */
  const [pins, setPins] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchStory(id).then((result) => {
      if (cancelled) return;
      setRow(result.row);
      setError(result.error);
      setLoading(false);
      if (result.row) setDraft(derive(result.row));
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const paras = useMemo(() => paragraphs(row?.body), [row]);

  if (loading) return <Frame copy={copy}><Reading copy={copy} /></Frame>;

  if (error && !row) {
    return (
      <Frame copy={copy}>
        <Failed copy={copy} detail={error} onRetry={() => navigate(0)} onSignIn={() => navigate('/review')} />
      </Frame>
    );
  }

  if (!row || !draft) {
    return (
      <Frame copy={copy}>
        <p className="rv-read">That submission is not in the queue.</p>
      </Frame>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current!, ...patch }));
  const hasImage = Boolean(row.attachment_url) && isImage(row.attachment_url);
  const translated = Boolean(draft.koTitle || draft.koBlurb || draft.koBody);

  /** Nothing is public until the last look, so this only moves the screen. */
  async function toCheck() {
    setChecking(true);
    setTaken(await permalinkTaken(draft!.slug));
    setPins(await pinCount());
  }

  async function press() {
    setBusy(true);
    const failed = await publishStory(row!, {
      slug: draft!.slug,
      title: draft!.title,
      topic: draft!.topic,
      format: draft!.format,
      context: draft!.context || null,
      date: draft!.date,
      blurb: draft!.blurb,
      color: hasImage ? null : draft!.color,
      koTitle: draft!.koTitle || null,
      koBlurb: draft!.koBlurb || null,
      koBody: draft!.koBody || null,
      constellation: draft!.constellation,
      arc: draft!.arc || null,
    });
    setBusy(false);

    if (failed) {
      setError(failed);
      return;
    }
    navigate('/review?queue=stories');
  }

  if (checking) {
    return (
      <Frame copy={copy}>
        <LastLook
          row={row}
          draft={draft}
          hasImage={hasImage}
          translated={translated}
          taken={taken}
          busy={busy}
          error={error}
          pins={pins}
          onBack={() => setChecking(false)}
          onPress={() => void press()}
        />
      </Frame>
    );
  }

  const invalid = !draft.slug || !draft.title.trim() || !draft.topic || !draft.format;

  return (
    <Frame copy={copy}>
      <div className="rv-stack" data-stack>
        {/* The story stays open the whole way down, not collapsed into a header. */}
        <div className="rv-sticky">
          <div className="rv-meta" style={{ paddingBottom: '22px' }}>
            <Pair label="Credit" value={row.credit_name || copy.anonymous} />
            <Pair label="Format ticked" value={(row.format ?? []).map(word).join(', ')} />
            <Pair label="Arc placed by them" value={row.arc_stage} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {paras.map((para, index) => (
              <p key={index} className="rv-read">
                {para}
              </p>
            ))}
          </div>
        </div>

        <div>
          <Step n="1" title="What it is called">
            <p className="rv-ask">The index needs a headline. They did not give one.</p>
            <Text label="Headline" value={draft.title} onChange={(title) => set({ title })} />
            <Text
              label="Permalink — this is the URL, and it cannot change later without breaking a link."
              value={draft.slug}
              onChange={(slug) => set({ slug: slugify(slug) ?? '' })}
            />
            <p className="rv-secondary rv-muted">
              Will read as <span className="rv-mono">innoco.co/story/{draft.slug || '…'}</span>
            </p>
          </Step>

          <Step n="2" title="Where it belongs">
            <p className="rv-ask">Topic — one of five. The index filters on this.</p>
            <Choices
              value={draft.topic}
              options={TOPICS.map((value) => ({ value, label: TAXONOMY.topic[value]?.en ?? value }))}
              onChange={(topic) => set({ topic })}
            />
            <p className="rv-secondary rv-muted">
              Signature marks the story the collection is built around — rare, and deliberate.
            </p>

            <p className="rv-ask" style={{ paddingTop: '12px' }}>
              Format — one, not several. The index colours by one.
            </p>
            <Choices
              value={draft.format}
              options={FORMATS.map((value) => ({ value, label: TAXONOMY.format[value]?.en ?? word(value) }))}
              onChange={(format) => set({ format })}
            />

            <p className="rv-ask" style={{ paddingTop: '12px' }}>
              Eyebrow — their door, and a line of context from you.
            </p>
            <div className="rv-name-line">
              <span className="rv-secondary">{row.door ?? '—'} ·</span>
              <Text label="" value={draft.context} onChange={(context) => set({ context })} />
            </div>

            <Text
              label="Published — defaults to the day they sent it"
              type="date"
              value={draft.date}
              onChange={(date) => set({ date })}
            />
          </Step>

          <Step n="3" title="How the card reads">
            <p className="rv-ask">Summary — their first paragraph, until you change it.</p>
            <Area value={draft.blurb} onChange={(blurb) => set({ blurb })} />

            <p className="rv-ask" style={{ paddingTop: '12px' }}>
              The card image.
            </p>
            {hasImage ? (
              <p className="rv-secondary rv-muted">Their photo — it goes on the card as it arrived.</p>
            ) : (
              <>
                <p className="rv-secondary rv-muted">
                  A flat plate instead — used when there is no image, and a PDF counts as no image.
                </p>
                <div className="rv-choices">
                  {PLATES.map((plate) => (
                    <button
                      key={plate.value}
                      type="button"
                      className="rv-swatch"
                      aria-pressed={draft.color === plate.value}
                      aria-label={plate.label}
                      title={plate.label}
                      style={{ background: plate.value }}
                      onClick={() => set({ color: plate.value })}
                    />
                  ))}
                </div>
              </>
            )}
          </Step>

          <Step n="4" title="Korean">
            <p className="rv-ask">Is there Korean copy for this story?</p>
            <Choices
              value={translated ? 'now' : 'not-yet'}
              options={[
                { value: 'not-yet', label: 'Not yet' },
                { value: 'now', label: 'Write it now' },
              ]}
              onChange={(value) =>
                value === 'not-yet' ? set({ koTitle: '', koBlurb: '', koBody: '' }) : set({ koTitle: draft.title })
              }
            />

            {translated ? (
              <>
                <Text label="Korean headline" value={draft.koTitle} onChange={(koTitle) => set({ koTitle })} />
                <Area value={draft.koBlurb} onChange={(koBlurb) => set({ koBlurb })} label="Korean summary" />
                <Area value={draft.koBody} onChange={(koBody) => set({ koBody })} label="Korean body" />
              </>
            ) : (
              // The only amber in the tool: a thing that is true and temporary,
              // which is neither an error nor a success — and which the
              // reviewer has to be told, because the page will render and look
              // finished.
              <div className="rv-note-amber">
                <strong>The Korean page will show English.</strong> Title, summary and body are carried across, so{' '}
                <span className="rv-mono">/ko/story/{draft.slug || '…'}</span> renders — in English — until somebody
                writes the Korean.
              </div>
            )}
          </Step>

          <Step n="5" title="The Constellation">
            <p className="rv-ask">
              The map is a third place, not a view of the index. A story can be published and deliberately left off
              it.
            </p>
            <Choices
              value={draft.constellation ? 'place' : 'leave'}
              options={[
                { value: 'place', label: 'Place it on the map' },
                { value: 'leave', label: 'Leave it off' },
              ]}
              onChange={(value) => set({ constellation: value === 'place' })}
            />

            {draft.constellation ? (
              <>
                <p className="rv-ask" style={{ paddingTop: '8px' }}>
                  Position on the arc — the field the form has been collecting all along.
                </p>
                <Choices
                  value={draft.arc}
                  options={ARCS.map((value) => ({ value, label: value }))}
                  onChange={(arc) => set({ arc })}
                />
              </>
            ) : null}
          </Step>

          <div className="rv-actions" style={{ paddingTop: '40px' }}>
            <button type="button" className="rv-btn" disabled={invalid} onClick={() => void toCheck()}>
              Last look before it goes on →
            </button>
            <Link to="/review?queue=stories" className="rv-btn-secondary">
              Save and come back to it
            </Link>
          </div>
          <p className="rv-secondary rv-muted" style={{ paddingTop: '14px' }}>
            {invalid
              ? 'A headline, a permalink, a topic and a format are needed before the last look.'
              : 'Nothing is public until the next screen.'}
          </p>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------- last look */

/**
 * One screen between editing and the public site.
 *
 * On the left, the card exactly as the index will show it; on the right, what
 * the press actually does, named plainly. This is where "published" becomes "on
 * the site" — the two facts the queue keeps apart all the way up to here.
 */
function LastLook({
  row,
  draft,
  hasImage,
  translated,
  taken,
  busy,
  error,
  pins,
  onBack,
  onPress,
}: {
  row: StoryRow;
  draft: Draft;
  hasImage: boolean;
  translated: boolean;
  taken: boolean;
  busy: boolean;
  error: string | null;
  /** How many of the wall's twelve places are pinned — see `WallNote`. */
  pins: number;
  onBack: () => void;
  onPress: () => void;
}) {
  return (
    <div className="rv-stack" data-stack>
      <div>
        <span className="rv-label rv-muted">The card, as the index will show it</span>
        <div className="rv-card-preview" style={{ marginTop: '14px' }}>
          {hasImage ? (
            <img className="rv-plate" src={row.attachment_url ?? ''} alt="" />
          ) : (
            <span className="rv-plate" style={{ background: draft.color }} aria-hidden="true" />
          )}
          <div className="rv-card-body">
            <span className="rv-label rv-muted">
              {[row.door, draft.context].filter(Boolean).join(' · ')}
            </span>
            <h3 className="rv-row-title">{draft.title}</h3>
            <p className="rv-secondary">{draft.blurb}</p>
            <span className="rv-label rv-quiet">
              {row.credit_name || 'Anonymous'} · {formatDate(draft.date)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="rv-row-title">Pressing publish puts it in {draft.constellation ? 'four' : 'three'} places</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '24px 0 0' }}>
          <Place label="Index">
            The card above, on <span className="rv-mono">/story/all</span>, filed under{' '}
            {TAXONOMY.topic[draft.topic]?.en ?? draft.topic}.
          </Place>
          <Place label="Story page">
            <span className="rv-mono">innoco.co/story/{draft.slug}</span> — permanent from this press onwards.
          </Place>
          <Place label="Korean page">
            <span className="rv-mono">/ko/story/{draft.slug}</span>{' '}
            {translated ? 'carries the Korean copy you wrote.' : 'exists and shows the English text, marked as not yet translated.'}
          </Place>
          {draft.constellation ? (
            <Place label="Constellation">
              Placed at {draft.arc || 'no stage yet'}
              {draft.arc && row.arc_stage === draft.arc ? ', where they put themselves.' : '.'}
            </Place>
          ) : null}
        </div>

        <WallNote pins={pins} date={draft.date} />

        <p className="rv-secondary rv-muted" style={{ padding: '26px 0 0' }}>
          The permalink cannot be changed after this without breaking the link. Everything else — headline, summary,
          topic, plate, the Korean, the map — can be edited later from the story's row.
        </p>

        {/* `id` is the permalink and the primary key at once, so a collision is
            not a database error to recover from: it is a reviewer about to
            overwrite a story that is already on the site with a different one. */}
        {taken ? (
          <div className="rv-note-amber" style={{ marginTop: '22px' }}>
            <strong>
              <span className="rv-mono">/story/{draft.slug}</span> already exists.
            </strong>{' '}
            Pressing publish replaces what is there. If this is a different story, go back and change the permalink.
          </div>
        ) : null}

        {error ? (
          <div className="rv-failed" style={{ marginTop: '22px' }}>
            <p className="rv-secondary">The press did not go through.</p>
            <p className="rv-failed-detail">{error}</p>
          </div>
        ) : null}

        <div className="rv-actions" style={{ paddingTop: '30px' }}>
          <button type="button" className="rv-btn" disabled={busy} onClick={onPress}>
            {busy ? 'Putting it on the site…' : 'Put it on the site'}
          </button>
          <button type="button" className="rv-btn-secondary" disabled={busy} onClick={onBack}>
            ← Back to the fields
          </button>
        </div>
        <p className="rv-secondary rv-muted" style={{ paddingTop: '14px' }}>
          Marks the submission published and writes the index entry in one press.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

/**
 * What the submission already implies, so the reviewer corrects rather than
 * fills in. Every one of these is a guess and every one is editable.
 */
function derive(row: StoryRow): Draft {
  const paras = paragraphs(row.body);
  const title = titleFrom(paras) ?? '';

  return {
    slug: slugify(title) ?? '',
    title,
    topic: topicFor(row.door).topic,
    format: formatOf(row.format) ?? 'writing',
    context: '',
    date: String(row.created_at ?? '').slice(0, 10),
    blurb: paras[0] ?? '',
    color: PLATES[0].value,
    koTitle: '',
    koBlurb: '',
    koBody: '',
    constellation: false,
    arc: row.arc_stage ?? '',
  };
}

const word = (value: string) => value[0].toUpperCase() + value.slice(1);

function isImage(url: string | null): boolean {
  const extension = (url ?? '').split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(extension);
}



function Place({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="rv-label rv-quiet" style={{ marginBottom: '6px' }}>
        {label}
      </div>
      <p className="rv-secondary">{children}</p>
    </div>
  );
}




function Pair({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="rv-pair">
      <span className="rv-label">{label}</span>
      <span className="rv-pair-value">{value}</span>
    </div>
  );
}

/**
 * Whether this story will be on the wall, said before the press rather than
 * discovered afterwards.
 *
 * The wall at the foot of `/story` shows twelve cards: the pinned ones first,
 * then the most recent. Both halves of that can keep a story off it, and
 * neither is visible from this screen — a reviewer publishes, goes to look, and
 * finds the page unchanged. So it is stated here, with the number, because
 * "twelve of twelve are pinned" is a fact somebody can act on and "it may not
 * appear" is not.
 *
 * A submission carries the day it was sent, and that is the date this publishes
 * with unless somebody changed it. Old submissions therefore land far down the
 * collection, which is the other half of the same surprise.
 */
function WallNote({ pins, date }: { pins: number; date: string }) {
  const full = pins >= WALL_CARDS;
  const old = date < new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);

  return (
    <div className="rv-strip" style={{ marginTop: '26px' }}>
      <span className="rv-strip-mark rv-muted">The wall at the foot of /story</span>
      <span className="rv-muted">
        {full
          ? `shows twelve cards and all twelve are pinned, so this story will not appear there. Pin it from its row in the queue — a pin goes to the front — or unpin one.`
          : pins > 0
            ? `shows twelve cards: ${pins} pinned, and the rest the most recent. This one joins ${old ? 'by its date, which is old enough that it probably will not reach them' : 'them if it is recent enough'}.`
            : `shows the twelve most recent. This one appears there ${old ? 'only if the collection is small — its date is an old one' : 'straight away'}.`}
      </span>
    </div>
  );
}
