import { useState, type FormEvent } from 'react';
import { sendSignInLink } from '../lib/auth';

/**
 * Getting in: one field, and the same answer whatever is typed into it.
 *
 * No password field, because there is no password — the emailed link is the
 * entire authentication. No sign-up and no forgot-password either: both imply a
 * password exists, and a tool whose sign-in form looks like every other sign-in
 * form invites somebody to try their usual one.
 *
 * The sent screen reads identically whether or not the address is on the staff
 * allowlist. That is load-bearing: telling somebody an address is unknown turns
 * this form into a way of reading the staff list one guess at a time. It is the
 * one thing here worth reviewing twice.
 */

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const failed = await sendSignInLink(email, `${window.location.origin}/review`);
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
      <Frame>
        <p className="rv-read">If that address is on the staff list, a sign-in link is on its way to it.</p>
        <p className="rv-read rv-muted" style={{ paddingTop: '14px' }}>
          The link opens this page, already signed in.
        </p>
      </Frame>
    );
  }

  return (
    <Frame>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <label className="rv-control">
          <span className="rv-label rv-quiet">Staff email</span>
          <input
            className="rv-field"
            type="email"
            value={email}
            autoComplete="email"
            autoFocus
            required
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {/* The field and the button change together — the field goes quiet, the
            button loses its ink ground. Nothing else moves, so nothing jumps. */}
        <div>
          <button type="submit" className={busy ? 'rv-btn-secondary' : 'rv-btn'} disabled={busy}>
            {busy ? 'Sending…' : 'Email me a link'}
          </button>
        </div>

        {error ? (
          <p className="rv-failed-detail" style={{ borderLeft: '3px solid var(--rv-failed)', paddingLeft: '14px' }}>
            {error}
          </p>
        ) : null}

        <p className="rv-secondary rv-muted">
          No password — the link is the sign-in. Only addresses on the staff list can reach anything here.
        </p>
      </form>
    </Frame>
  );
}

/** 560px and generous gutters: the one screen allowed to be nearly empty. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rv-page rv-page--narrow">
      <header style={{ paddingBottom: '28px', borderBottom: '1px solid var(--rv-teal)', marginBottom: '38px' }}>
        <span className="rv-label rv-eyebrow">IN · Internal</span>
        <h1 className="rv-title">Review desk</h1>
        <p className="rv-secondary rv-muted" style={{ paddingTop: '14px' }}>
          Where we read what people sent us.
        </p>
      </header>
      {children}
    </div>
  );
}
