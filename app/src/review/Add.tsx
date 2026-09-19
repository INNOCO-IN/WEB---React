import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TAXONOMY } from '../lib/content/stories';
import { addStory, permalinkTaken, whyNot } from '../lib/services/review';
import { ARCS, FORMATS, TOPICS, slugify, type NewStory } from '../lib/story-promotion';
import { useDeskCopy } from './copy';
import { Area, Choices, Frame, PLATES, Picture, Step, Text } from './parts';

/**
 * Writing a story the desk is publishing itself.
 *
 * The other door into the collection. `Publish` starts from something a visitor
 * sent and asks for the half the form never collected; this starts from nothing
 * at all, which is how most of what is on the site got there — those rows were
 * written into `site/data/stories.js` and reached the database through the
 * seed, so adding a story IN wrote itself used to mean editing a file and
 * re-running two scripts.
 *
 * Same table, same builder, same shape as a published submission. What differs
 * is what can be derived: nothing can, so every field is asked for, and the
 * ones that can sensibly be guessed from another field are — the permalink
 * follows the headline until somebody types over it, and the date starts today.
 *
 * **The map is on by default here.** Publishing a submission asks and defaults
 * to no, because a submission is a story first and a light second. A story the
 * desk sits down to write is being put on the site deliberately, so the point
 * is the expected half rather than the extra one.
 */

const today = () => new Date().toISOString().slice(0, 10);

interface Draft extends NewStory {
  constellation: boolean;
  arc: string;
  /** True once somebody edits the permalink, which stops it following the title. */
  ownSlug: boolean;
}

const BLANK: Draft = {
  slug: '',
  title: '',
  topic: 'lived',
  format: 'writing',
  date: today(),
  eyebrow: '',
  blurb: '',
  body: '',
  credit: '',
  color: '',
  image: '',
  koTitle: '',
  koBlurb: '',
  koBody: '',
  constellation: true,
  arc: '',
  ownSlug: false,
};

export default function Add({ email }: { email: string }) {
  const navigate = useNavigate();
  const { copy } = useDeskCopy();

  const [draft, setDraft] = useState<Draft>(BLANK);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const wrong = useMemo(() => whyNot(draft), [draft]);
  const word = (list: Record<string, { en: string }>, key: string) => list[key]?.en ?? key;

  async function press() {
    setBusy(true);

    // Asked here rather than as you type: it is a question for the database,
    // and the answer only matters at the moment of writing.
    if (await permalinkTaken(draft.slug)) {
      setBusy(false);
      setFailed(`Something is already published at /story/${draft.slug}. Choose another permalink.`);
      return;
    }

    const error = await addStory(
      draft,
      { constellation: draft.constellation, arc: draft.arc || null },
      email,
    );

    setBusy(false);
    if (error) {
      setFailed(error);
      return;
    }

    // Straight to the story in the list, rather than to the top of it.
    navigate(`/review?queue=stories&q=${encodeURIComponent(draft.slug)}`);
  }

  return (
    <Frame copy={copy}>
      <div style={{ maxWidth: 'var(--rv-measure-read)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Step n="1" title="What it is called">
          <p className="rv-ask">
            A story IN is publishing itself — nobody sent this one through the form.
          </p>
          <Text
            label="Headline"
            value={draft.title}
            onChange={(title) =>
              set({ title, slug: draft.ownSlug ? draft.slug : (slugify(title) ?? '') })
            }
          />
          <Text
            label="Permalink — this is the URL, and it cannot change later without breaking a link."
            value={draft.slug}
            onChange={(slug) => set({ slug: slugify(slug) ?? '', ownSlug: true })}
          />
          <p className="rv-secondary rv-muted">
            Will read as <span className="rv-mono">innoco.co/story/{draft.slug || '…'}</span>
          </p>
        </Step>

        <Step n="2" title="Where it files">
          <p className="rv-ask">The index groups by these, and the map clusters by the topic.</p>
          <div className="rv-label rv-quiet">Topic</div>
          <Choices
            value={draft.topic}
            options={TOPICS.map((value) => ({ value, label: word(TAXONOMY.topic, value) }))}
            onChange={(topic) => set({ topic })}
          />
          <div className="rv-label rv-quiet" style={{ paddingTop: '14px' }}>
            Format
          </div>
          <Choices
            value={draft.format}
            options={FORMATS.map((value) => ({ value, label: word(TAXONOMY.format, value) }))}
            onChange={(format) => set({ format })}
          />
          <Text label="Published on" type="date" value={draft.date} onChange={(date) => set({ date })} />
        </Step>

        <Step n="3" title="What it says">
          <p className="rv-ask">
            The eyebrow and the blurb are the card; the body is what the index opens.
          </p>
          <Text
            label="Eyebrow — 'I lived it · A classroom'. Optional."
            value={draft.eyebrow ?? ''}
            onChange={(eyebrow) => set({ eyebrow })}
          />
          <Area
            label="Blurb — the sentence on the card. Left empty, the first paragraph stands in."
            value={draft.blurb ?? ''}
            onChange={(blurb) => set({ blurb })}
          />
          <Area
            label="The story — one paragraph per blank line."
            value={draft.body ?? ''}
            onChange={(body) => set({ body })}
          />
          <Text
            label="Credit — left empty, the map says Anonymous."
            value={draft.credit ?? ''}
            onChange={(credit) => set({ credit })}
          />
        </Step>

        <Step n="4" title="In Korean">
          <p className="rv-ask">
            Optional. Left empty, the English is carried across so the Korean page renders
            something — and the row says so.
          </p>
          <Text label="Headline · KO" value={draft.koTitle ?? ''} onChange={(koTitle) => set({ koTitle })} />
          <Area label="Blurb · KO" value={draft.koBlurb ?? ''} onChange={(koBlurb) => set({ koBlurb })} />
          <Area label="The story · KO" value={draft.koBody ?? ''} onChange={(koBody) => set({ koBody })} />
        </Step>

        <Step n="5" title="What it looks like">
          <Picture
            copy={copy}
            url={draft.image ?? ''}
            onChange={(image) => set({ image })}
            onFailed={setFailed}
          />
          {/* The plate is what a card shows in place of a picture, so it is only
              a question while there is no picture. */}
          {draft.image ? null : (
            <>
              <div className="rv-label rv-quiet" style={{ paddingTop: '14px' }}>
                Plate colour, for the card with no picture
              </div>
              <Choices
                value={draft.color ?? ''}
                options={PLATES}
                onChange={(color) => set({ color: color === draft.color ? '' : color })}
              />
            </>
          )}
        </Step>

        <Step n="6" title="On the map">
          <p className="rv-ask">
            The Constellation is a third place, not a view of the index — a story can be published
            and deliberately left off it. This one goes on unless you say otherwise.
          </p>
          <label className="rv-control" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={draft.constellation}
              onChange={(event) => set({ constellation: event.target.checked })}
            />
            <span className="rv-secondary">Place a point on the Constellation</span>
          </label>
          {draft.constellation ? (
            <>
              <div className="rv-label rv-quiet">Arc — optional, and left empty rather than guessed.</div>
              <Choices
                value={draft.arc}
                options={ARCS.map((value) => ({ value, label: value }))}
                onChange={(arc) => set({ arc: arc === draft.arc ? '' : arc })}
              />
            </>
          ) : null}
        </Step>

        {/* What the press does, before it does it — the same courtesy the
            publishing screen's last look pays, in the space this screen has. */}
        <div className="rv-strip rv-strip--live" style={{ marginTop: '26px' }}>
          <span className="rv-strip-mark">This press writes</span>
          <span>
            the story index at <span className="rv-mono">/story/all?story={draft.slug || '…'}</span>, the
            Korean page{draft.koTitle || draft.koBlurb || draft.koBody ? '' : ' (English carried across)'}
            {draft.constellation ? ', and a point on the Constellation' : ''}. It does not go on the wall
            at the foot of /story until somebody pins it, or until it is one of the twelve most recent.
          </span>
        </div>

        {failed ? <p className="rv-failed-detail">{failed}</p> : null}
        {wrong && !failed ? <p className="rv-label rv-note-amber">{wrong}</p> : null}

        <div className="rv-actions">
          <button
            type="button"
            className="rv-btn"
            disabled={Boolean(wrong) || busy}
            onClick={() => void press()}
          >
            {busy ? copy.saving : 'Add the story'}
          </button>
          <button type="button" className="rv-btn-secondary" onClick={() => navigate('/review?queue=stories')}>
            {copy.backToQueue}
          </button>
        </div>
      </div>
    </Frame>
  );
}
