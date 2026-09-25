import { useEffect, useRef, useState, type FormEvent } from 'react';
import { beginEnrolment, signOut, verifyCode, type Enrolment } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { isCompleteCode, normaliseCode } from '../lib/second-factor';
import { Door } from './Door';

/**
 * The second door: six digits from an authenticator app.
 *
 * Two screens, and which one you get depends only on whether you already hold
 * a factor. `Enrol` mints one and takes the first code as proof it was stored;
 * `Challenge` asks for a code from one you have. Both end the same way — the
 * session is replaced with an aal2 one and the desk appears — and neither is
 * what grants access. `is_staff()` reads the `aal` claim, so a reviewer who got
 * past these screens by some trick of the page would still be handed an empty
 * database. These exist to explain and to upgrade the token, not to guard.
 *
 * TOTP rather than a second email. The first factor is already a mailbox, so a
 * code mailed to the same place is one break away from being no second factor
 * at all — and Supabase has no email factor to raise `aal` with, so the
 * database could not see it even if it were worth having.
 */

export default function SecondFactor({
  email,
  hasFactor,
  required,
}: {
  email: string;
  /** Verified, not merely started. An abandoned QR code is not a factor. */
  hasFactor: boolean;
  /** Under `enrolled` a reviewer without a factor is offered the way past. */
  required: boolean;
}) {
  return hasFactor ? <Challenge email={email} /> : <Enrol email={email} required={required} />;
}

/* --------------------------------------------------------------- enrolling */

/**
 * Setting one up: scan, then prove it was stored.
 *
 * The code at the end is not ceremony. Supabase keeps the factor `unverified`
 * until a code from it verifies, and that is the only moment anyone finds out
 * whether the QR actually landed in an app — without it a reviewer could sail
 * through setup, close the tab, and discover at the next sign-in that they own
 * a factor they cannot answer. Better to fail here, with the QR still up.
 */
function Enrol({ email, required }: { email: string; required: boolean }) {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Minted on arrival rather than behind a "start" button. The reviewer did not
  // come here to be asked whether they meant it; they came here because the
  // desk will not open until this is done.
  //
  // The ref is what keeps that to one secret per screen. React runs effects
  // twice in development on purpose, and two enrolments under one friendly name
  // is a 422 the reviewer would read as the desk being broken.
  //
  // And there is deliberately no `cancelled` flag beside it, which is the part
  // that cost an afternoon. The usual pair — a ref to run once, a flag to
  // discard a late result — cancel each other out here: the first run's cleanup
  // sets the flag, the second run returns early on the ref, and the enrolment
  // that did succeed is thrown away by the very flag meant to protect it. The
  // screen then waits forever on a secret it already has. The ref alone is
  // enough, because it guarantees one request for the life of the component,
  // and a stray setState after unmount is a no-op React no longer warns about.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void beginEnrolment(`${email} · review desk`).then((result) => {
      setEnrolment(result.enrolment);
      setError(result.error);
    });
  }, [email]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!enrolment || !isCompleteCode(code) || busy) return;
    setBusy(true);
    setError(null);

    const failed = await verifyCode(enrolment.factorId, normaliseCode(code));
    setBusy(false);

    // No success branch, and that is deliberate: verifying replaces the session,
    // `onAuthStateChange` fires, and the desk swaps this screen for the queue.
    // Anything set here would be setting state on a screen already gone.
    if (failed) {
      setError(failed);
      setCode('');
    }
  }

  return (
    <Door>
      <p className="rv-read">
        {required
          ? 'The desk needs a second factor as well as the link. Set one up once, then a code from it each time you sign in.'
          : 'Add a second factor. The link alone is one factor and it is your mailbox — this is the one that does not travel with it.'}
      </p>

      <ol className="rv-enrol">
        <li>
          <span className="rv-label rv-quiet">One</span>
          <p className="rv-secondary">
            Scan this with an authenticator app — 1Password, Google Authenticator, Authy, whichever you already have.
          </p>
          <Qr enrolment={enrolment} error={error} />
          {enrolment ? (
            <p style={{ paddingTop: '14px' }}>
              {/* A desktop password manager cannot scan a screen it is on. */}
              <button type="button" className="rv-btn-quiet" onClick={() => setShowSecret((on) => !on)}>
                {showSecret ? 'Hide the setup key' : 'Cannot scan? Show the setup key'}
              </button>
            </p>
          ) : null}
          {showSecret && enrolment ? <p className="rv-secret">{enrolment.secret}</p> : null}
        </li>

        <li>
          <span className="rv-label rv-quiet">Two</span>
          <p className="rv-secondary">
            Type the six digits it shows. Nothing is stored until you do — this is what proves the app really has it.
          </p>
          <CodeForm
            code={code}
            setCode={setCode}
            onSubmit={submit}
            busy={busy}
            disabled={!enrolment}
            label="Confirm and finish"
          />
        </li>
      </ol>

      {/* Shown whenever there is one, and the condition is worth stating: an
          enrolment that never arrived is exactly when the reason matters most,
          and gating this on `enrolment` left the QR saying "see below" with
          nothing below it. A 422 from a project that has TOTP switched off
          reads, from the reviewer's chair, as the desk being broken. */}
      {error ? <Failure detail={error} /> : null}
      <Footer email={email} />
    </Door>
  );
}

/**
 * The QR, or an honest account of why there is not one.
 *
 * `qr_code` is an SVG data URL minted by Supabase alongside the secret, so it
 * is an `img src` and nothing more — no QR library in the bundle, and no public
 * QR service handed the secret in a query string to write down in its logs.
 */
function Qr({ enrolment, error }: { enrolment: Enrolment | null; error: string | null }) {
  if (enrolment) {
    return (
      <div className="rv-qr">
        <img src={enrolment.qrCode} alt="" width={200} height={200} />
      </div>
    );
  }

  return (
    <div className="rv-qr rv-qr--empty">
      <p className="rv-secondary rv-muted">{error ? 'No code — see below.' : 'Preparing a code…'}</p>
    </div>
  );
}

/* -------------------------------------------------------------- challenging */

/** Signing in with one you already have. One field, and a way back out. */
function Challenge({ email }: { email: string }) {
  return (
    <Door>
      <StepUp label="Open the desk" />

      {/* Named rather than hinted at. A reviewer whose phone is gone needs to
          know who to ask, not to be told to try again on a screen that cannot
          help them -- and self-serve recovery here would be a second door opened
          by the same key as the first. */}
      <p className="rv-secondary rv-muted" style={{ paddingTop: '30px' }}>
        Lost the device it was on? Nobody can reset this from the desk, by design. Ask whoever holds the
        service-role key to run <code className="rv-mono">npm run mfa-reset</code> for this address, then set a new
        one up.
      </p>

      <Footer email={email} />
    </Door>
  );
}

/**
 * The code, asked for wherever it is needed rather than only at the door.
 *
 * Exported because the door is not the only place a session has to get
 * stronger. Under the `off` policy nobody is ever challenged, so a session
 * stays at aal1 for its whole life -- and `is_admin()` wants aal2 whatever the
 * policy says. Without a way to ask for the code from inside the desk, an
 * administrator who set the policy to `off` could never reach the screen that
 * would let them set it back. The switch has to work in both directions or it
 * is not a switch.
 *
 * Verifying replaces the token in place, so nothing here needs to route or
 * reload: `onAuthStateChange` fires, `useStrength` re-reads, and whatever was
 * waiting on aal2 simply appears.
 */
export function StepUp({ label }: { label: string }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isCompleteCode(code) || busy) return;
    setBusy(true);
    setError(null);

    // The factor is read here rather than passed down, so a reviewer holding two
    // of them — a phone and a password manager, say — is not tied to whichever
    // one the desk happened to list first.
    const list = await supabase?.auth.mfa.listFactors();
    const factor = (list?.data?.all ?? []).find((each) => each.status === 'verified');

    if (!factor) {
      setBusy(false);
      setError('No verified factor is registered for this account any more.');
      return;
    }

    const failed = await verifyCode(factor.id, normaliseCode(code));
    setBusy(false);
    if (failed) {
      setError(failed);
      setCode('');
    }
  }

  return (
    <>
      <p className="rv-read">Your authenticator has a six-digit code. Type it in.</p>

      <div style={{ paddingTop: '30px' }}>
        <CodeForm code={code} setCode={setCode} onSubmit={submit} busy={busy} disabled={false} label={label} />
      </div>

      {error ? <Failure detail={error} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ shared */

/**
 * The six digits.
 *
 * `inputMode="numeric"` and `autoComplete="one-time-code"` between them are what
 * make this bearable on a phone: the numeric keypad, and iOS offering the code
 * straight from the message. Stripping to digits on the way in means a pasted
 * "482 915" is accepted rather than silently refused as eight characters.
 */
function CodeForm({
  code,
  setCode,
  onSubmit,
  busy,
  disabled,
  label,
}: {
  code: string;
  setCode: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <label className="rv-control">
        <span className="rv-label rv-quiet">Six-digit code</span>
        <input
          className="rv-field rv-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          autoFocus
          required
          disabled={busy || disabled}
          onChange={(event) => setCode(normaliseCode(event.target.value))}
        />
      </label>

      <div>
        <button
          type="submit"
          className={busy ? 'rv-btn-secondary' : 'rv-btn'}
          disabled={busy || disabled || !isCompleteCode(code)}
        >
          {busy ? 'Checking…' : label}
        </button>
      </div>
    </form>
  );
}

/** A refused code, shaped like every other failure in the tool. */
function Failure({ detail }: { detail: string }) {
  return (
    <p
      className="rv-failed-detail"
      style={{ borderLeft: '3px solid var(--rv-failed)', paddingLeft: '14px', marginTop: '26px' }}
    >
      {detail}
    </p>
  );
}

/**
 * Who you are, and the way back out.
 *
 * Signing out matters more on these screens than anywhere else in the tool: a
 * reviewer stuck at a code they cannot produce is otherwise stuck with a
 * half-signed-in session and no visible way to start again as somebody else.
 */
function Footer({ email }: { email: string }) {
  return (
    <div className="rv-whoami" style={{ paddingTop: '38px', marginTop: '34px', borderTop: '1px solid var(--rv-line)' }}>
      <span className="rv-secondary rv-muted">Signed in as {email}</span>
      <button type="button" className="rv-btn-quiet" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
