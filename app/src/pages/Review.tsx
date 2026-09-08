import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { sendSignInLink, signOut, useSession } from '../lib/auth';
import {
  INBOX,
  STATUSES,
  fetchIntake,
  isStaff,
  setStatus,
  type IntakeTable,
  type RegistrationRow,
  type StoryRow,
  type SubmissionRow,
} from '../lib/services/review';

/**
 * The review desk: what visitors sent, and how it moves.
 *
 * Deliberately not a page of the site. It has no nav, no footer, no locale and
 * no entry in the route table — it is reached by typing `/review`, it is
 * `noindex`, and nothing links to it. The public pages are generated from
 * `site/`; this one is hand-written, because it is a tool rather than a page.
 *
 * It shows the three intake tables and lets a reviewer move a row's status. It
 * does **not** publish a story to the site: `stories` and `story_entries` are
 * different tables, and the gap between them is editorial — a title, a topic
 * and a permalink that the form never asked for. Marking a story `published`
 * records the decision; `scripts/promote-story.mjs` is what carries it across.
 *
 * Everything here is gated by RLS, not by this file. A stranger who signs in
 * sees an empty desk because the database says so, which is why the empty case
 * is spelled out rather than left to look like a slow network.
 */

const SHELL: CSSProperties = {
  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
  background: '#FAF4E2',
  color: '#2E3B40',
  minHeight: '100vh',
  padding: '32px 24px 80px',
};

const WRAP: CSSProperties = { maxWidth: '980px', margin: '0 auto' };

const CARD: CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(46,59,64,0.14)',
  borderRadius: '10px',
  padding: '16px 18px',
  marginBottom: '10px',
};

const LABEL: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(46,59,64,0.55)',
};

const BUTTON: CSSProperties = {
  font: 'inherit',
  fontSize: '13px',
  padding: '7px 14px',
  borderRadius: '999px',
  border: '1px solid rgba(46,59,64,0.3)',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
};

const TABS: { table: IntakeTable; label: string }[] = [
  { table: 'stories', label: 'Stories' },
  { table: 'submissions', label: 'Are you IN?' },
  { table: 'workshop_registrations', label: 'Workshop sign-ups' },
];

export default function Review() {
  const { session, loading } = useSession();

  // A staff tool has no business in an index, and the site's own head sync does
  // not run here — this page is outside the generated route table.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const previous = document.title;
    document.title = 'Review desk — IN';
    return () => {
      meta.remove();
      document.title = previous;
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <p>
          This build has no Supabase keys, so there is nothing to review. Copy <code>.env.example</code> to{' '}
          <code>.env.local</code> and fill it in.
        </p>
      </Shell>
    );
  }

  if (loading) return <Shell />;
  if (!session) return <SignIn />;
  return <Desk email={session.user.email ?? ''} />;
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div style={SHELL}>
      <div style={WRAP}>
        <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '30px', margin: '0 0 24px' }}>
          Review desk
        </h1>
        {children}
      </div>
    </div>
  );
}

/**
 * The sign-in form.
 *
 * One field, and the same answer whatever is typed into it. Saying "that
 * address is not on the list" would turn the form into a way of reading the
 * allowlist one guess at a time.
 */
function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const failed = await sendSignInLink(email, window.location.origin + '/review');
    setBusy(false);

    // In production a rejected address must not read differently from an
    // accepted one, or the form becomes a way of testing the allowlist — so
    // only a genuine fault is surfaced and everything else says "check your
    // mail". In development that same silence is useless: "no such user" and
    // "the project has no SMTP" both present as a link that never arrives. So
    // development says what actually happened.
    if (failed && import.meta.env.DEV) {
      setError(`${failed} — see \`npm run signin-link\` in SUPABASE.md.`);
      return;
    }
    if (failed && !/user not found|signups not allowed|not authorized/i.test(failed)) setError(failed);
    else setSent(true);
  }

  if (sent) {
    return (
      <Shell>
        <p style={{ maxWidth: '52ch', lineHeight: 1.5 }}>
          If that address is on the staff list, a sign-in link is on its way to it. The link opens this page,
          already signed in.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} style={{ maxWidth: '380px' }}>
        <label htmlFor="review-email" style={{ ...LABEL, display: 'block', marginBottom: '8px' }}>
          Staff email
        </label>
        <input
          id="review-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          style={{
            font: 'inherit',
            width: '100%',
            padding: '11px 13px',
            borderRadius: '8px',
            border: '1px solid rgba(46,59,64,0.3)',
            marginBottom: '12px',
          }}
        />
        <button type="submit" disabled={busy} style={{ ...BUTTON, opacity: busy ? 0.5 : 1 }}>
          {busy ? 'Sending…' : 'Email me a link'}
        </button>
        {error ? <p style={{ color: '#B3261E', fontSize: '13px', marginTop: '12px' }}>{error}</p> : null}
        <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'rgba(46,59,64,0.7)', marginTop: '18px' }}>
          No password — the link is the sign-in. Only addresses on the staff list can reach anything here.
        </p>
      </form>
    </Shell>
  );
}

function Desk({ email }: { email: string }) {
  const [tab, setTab] = useState<IntakeTable>('stories');
  const [staff, setStaff] = useState<boolean | null>(null);

  useEffect(() => {
    void isStaff().then(setStaff);
  }, []);

  return (
    <div style={SHELL}>
      <div style={WRAP}>
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '22px',
          }}
        >
          <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '30px', margin: 0 }}>
            Review desk
          </h1>
          <div style={{ fontSize: '13px', color: 'rgba(46,59,64,0.7)' }}>
            {email}{' '}
            <button type="button" onClick={() => void signOut()} style={{ ...BUTTON, padding: '4px 12px', marginLeft: '8px' }}>
              Sign out
            </button>
          </div>
        </header>

        {staff === false ? (
          /*
           * Two different faults look identical from here, and saying only the
           * likelier one sends people to check the wrong thing. RLS answers a
           * denied read with an empty list rather than an error, so "you are not
           * on the allowlist" and "this project has no staff policies" are the
           * same empty array — and the second is the one that is true on a
           * database where the schema has not been applied yet.
           */
          <div style={{ maxWidth: '60ch', lineHeight: 1.55 }}>
            <p>
              You are signed in as <strong>{email}</strong>, and this desk is empty. That is one of two things,
              and they look the same from here:
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>
                The staff policies are not on this project yet — <code>schema.sql</code> §2d, which creates{' '}
                <code>is_staff()</code>. Check with <code>npm run db:types</code>: no <code>is_staff</code> under{' '}
                <code>Functions</code> means it has not been applied.
              </li>
              <li>
                They are applied, and this address is not in <code>staff_emails</code> — see{' '}
                <code>seed-staff.sql</code>.
              </li>
            </ul>
          </div>
        ) : (
          <>
            <nav style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {TABS.map(({ table, label }) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => setTab(table)}
                  style={{
                    ...BUTTON,
                    background: tab === table ? '#2E3B40' : 'transparent',
                    color: tab === table ? '#FAF4E2' : 'inherit',
                    borderColor: tab === table ? '#2E3B40' : 'rgba(46,59,64,0.3)',
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <Queue key={tab} table={tab} />
          </>
        )}
      </div>
    </div>
  );
}

/** One table's rows, inbox first. */
function Queue({ table }: { table: IntakeTable }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchIntake<Record<string, unknown>>(table);
    setRows(result.rows);
    setError(result.error);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(id: string, status: string) {
    const failed = await setStatus(table, id, status);
    if (failed) setError(failed);
    else await load();
  }

  if (loading) return <p style={{ color: 'rgba(46,59,64,0.6)' }}>Reading…</p>;
  if (error) return <p style={{ color: '#B3261E' }}>{error}</p>;
  if (!rows.length) return <p style={{ color: 'rgba(46,59,64,0.6)' }}>Nothing here.</p>;

  const inbox = INBOX[table];
  const waiting = rows.filter((row) => row.status === inbox);
  const handled = rows.filter((row) => row.status !== inbox);

  return (
    <>
      <h2 style={{ ...LABEL, margin: '0 0 10px' }}>
        {waiting.length} waiting
      </h2>
      {waiting.map((row) => (
        <Row key={String(row.id)} table={table} row={row} onMove={move} />
      ))}

      {handled.length ? (
        <>
          <h2 style={{ ...LABEL, margin: '28px 0 10px' }}>{handled.length} handled</h2>
          {handled.map((row) => (
            <Row key={String(row.id)} table={table} row={row} onMove={move} />
          ))}
        </>
      ) : null}
    </>
  );
}

function Row({
  table,
  row,
  onMove,
}: {
  table: IntakeTable;
  row: Record<string, unknown>;
  onMove: (id: string, status: string) => Promise<void>;
}) {
  const id = String(row.id);
  const status = String(row.status ?? '');
  const when = String(row.created_at ?? '').slice(0, 10);

  return (
    <article style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={LABEL}>
          {when} · {status}
        </span>
        <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STATUSES[table]
            .filter((next) => next !== status)
            .map((next) => (
              <button key={next} type="button" onClick={() => void onMove(id, next)} style={{ ...BUTTON, padding: '4px 12px' }}>
                {next}
              </button>
            ))}
        </span>
      </div>
      <Body table={table} row={row} />
    </article>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  const text = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <p style={{ margin: '10px 0 0', fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
      <span style={{ ...LABEL, marginRight: '8px' }}>{label}</span>
      {text}
    </p>
  );
}

/** Each table shows the fields its form actually asked for. */
function Body({ table, row }: { table: IntakeTable; row: Record<string, unknown> }) {
  if (table === 'stories') {
    const story = row as unknown as StoryRow;
    return (
      <>
        <Field label="Door" value={story.door} />
        <Field label="Format" value={story.format} />
        <Field label="Arc" value={story.arc_stage} />
        <Field label="Credit" value={story.credit_name || 'Anonymous'} />
        <Field label="Body" value={story.body} />
        <Field label="Attachment" value={story.attachment_url} />
        <Field label="Email" value={story.email} />
        {story.status === 'published' ? (
          <p style={{ margin: '12px 0 0', fontSize: '13px', color: 'rgba(46,59,64,0.7)', lineHeight: 1.5 }}>
            Published here means readable, not on the site. Carry it across with{' '}
            <code>npm run promote-story</code>.
          </p>
        ) : null}
      </>
    );
  }

  if (table === 'submissions') {
    const enquiry = row as unknown as SubmissionRow;
    return (
      <>
        <Field label="Name" value={enquiry.name} />
        <Field label="Email" value={enquiry.email} />
        <Field label="Brings" value={enquiry.brings} />
        <Field label="Message" value={enquiry.message} />
        <Field label="From" value={enquiry.source_page} />
      </>
    );
  }

  const signup = row as unknown as RegistrationRow;
  return (
    <>
      <Field label="Name" value={signup.name} />
      <Field label="Email" value={signup.email} />
      <Field label="Org" value={signup.org} />
      <Field label="Workshop" value={signup.workshop_slug} />
      <Field label="Message" value={signup.message} />
      <Field label="From" value={signup.source_page} />
    </>
  );
}
