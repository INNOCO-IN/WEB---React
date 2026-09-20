import { useRef, useState, type FormEvent } from 'react';
import { sendSignInLink } from '../lib/auth';
import { isCaptchaConfigured } from '../lib/captcha';
import { answerFor } from '../lib/sign-in';
import { Door } from './Door';
import Turnstile, { type CaptchaHandle } from './Turnstile';

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
 *
 * Since the CAPTCHA there is a second thing worth reviewing: the widget is
 * re-armed on **every** exit from `submit`, successful or not. A Turnstile
 * token is single use, so a form that keeps one after using it tells the next
 * attempt it failed a puzzle it already solved.
 */

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const captcha = useRef<CaptchaHandle>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    if (isCaptchaConfigured && !token) return;

    setBusy(true);
    setError(null);
    const failed = await sendSignInLink(email, `${window.location.origin}/review`, token ?? undefined);
    setBusy(false);

    // Spent either way, so re-armed either way. The success path needs it too:
    // the sent screen is not a dead end — somebody who mistyped their address
    // can go back, and the form they come back to must be usable.
    captcha.current?.reset();

    // In development, say what actually happened. The silence below is right in
    // production and useless here: "no such user" and "the project has no SMTP"
    // both present as a link that never arrives, and one of them is a bug.
    if (failed && import.meta.env.DEV) {
      setError(`${failed.message} — see \`npm run signin-link\` in SUPABASE.md.`);
      return;
    }

    // In production a rejected address must not read differently from an
    // accepted one, or the form becomes a way of testing the allowlist one
    // guess at a time. `answerFor` is where that rule lives, and it is tested —
    // see lib/sign-in.ts for why it stopped being safe to leave inline.
    if (failed && answerFor(failed) === 'report') setError(failed.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <Door>
        <p className="rv-read">If that address is on the staff list, a sign-in link is on its way to it.</p>
        <p className="rv-read rv-muted" style={{ paddingTop: '14px' }}>
          The link opens this page, already signed in.
        </p>
        <p className="rv-secondary rv-muted" style={{ paddingTop: '26px' }}>
          <button type="button" className="rv-btn-quiet" onClick={() => setSent(false)}>
            Use a different address
          </button>
        </p>
      </Door>
    );
  }

  return (
    <Door>
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

        {/* Rendered only when there is a key to render it with, so a checkout
            without .env.local still has a working form rather than a dead
            button beside an empty box. */}
        {isCaptchaConfigured ? <Turnstile handle={captcha} onToken={setToken} /> : null}

        {/* The field and the button change together — the field goes quiet, the
            button loses its ink ground. Nothing else moves, so nothing jumps. */}
        <div>
          <button
            type="submit"
            className={busy ? 'rv-btn-secondary' : 'rv-btn'}
            disabled={busy || (isCaptchaConfigured && !token)}
          >
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
    </Door>
  );
}
