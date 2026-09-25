import { useCallback, useEffect, useState } from 'react';
import { useSession, useStrength, verifiedCount } from '../lib/auth';
import { formatDate } from '../lib/format';
import type { SecondFactorPolicy } from '../lib/second-factor';
import { fetchSecondFactorPolicy } from '../lib/services/review';
import {
  amAdmin,
  changeRoster,
  fetchRoster,
  saveSecondFactor,
  withoutFactor,
  type RosterAction,
  type RosterEntry,
} from '../lib/services/roster';
import { useDeskCopy } from './copy';
import { Frame, Segmented, Text } from './parts';
import { StepUp } from './SecondFactor';
import { Reading } from './States';

/**
 * Who reaches the desk, and how hard the door bites.
 *
 * Not a tab. The rail is queues — things that arrive, are counted, and get
 * worked through — and this is none of those; a fifth tab with no count beside
 * it would read as an empty queue. It is a route, reached from the header by
 * the people who can use it, the same way the publishing flow is.
 *
 * **Every screen here is about a distinction the database makes and a page
 * cannot.** `is_admin()` is false for two different people — somebody who is
 * not an administrator, and an administrator who has not verified a code this
 * session — and those want opposite answers. The assurance level is the one
 * thing the browser can read for itself, so it is what tells them apart.
 */
export default function People() {
  const { copy } = useDeskCopy();
  const { session } = useSession();
  const strength = useStrength(session);

  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<RosterEntry[]>([]);
  const [policy, setPolicy] = useState<SecondFactorPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [asAdmin, setAsAdmin] = useState(false);

  const me = (session?.user.email ?? '').toLowerCase();

  const load = useCallback(async () => {
    const [may, list, current] = await Promise.all([amAdmin(), fetchRoster(), fetchSecondFactorPolicy()]);
    setAdmin(may);
    setRows(list.rows);
    setPolicy(current);
    // A read that failed is reported; a read that returned nothing because the
    // caller is not an administrator is not an error and must not read as one.
    setError(may ? list.error : null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** One change, then re-read. The server is the only thing that knows. */
  async function act(action: RosterAction, target: string, isAdmin?: boolean) {
    setBusy(true);
    setError(null);
    setWarning(null);
    const out = await changeRoster(action, target, isAdmin);
    if (out.error) setError(out.error);
    if (out.warning) setWarning(out.warning);
    if (!out.error) await load();
    setBusy(false);
  }

  async function onAdd() {
    const address = email.trim();
    if (!address.includes('@')) return;
    await act('add', address, asAdmin);
    setEmail('');
    setAsAdmin(false);
  }

  async function onPolicy(next: SecondFactorPolicy) {
    setBusy(true);
    setError(null);
    const failed = await saveSecondFactor(next);
    if (failed) setError(failed);
    else setPolicy(next);
    setBusy(false);
  }

  if (admin === null || policy === null) {
    return (
      <Frame copy={copy}>
        <Reading copy={copy} />
      </Frame>
    );
  }

  /*
    Refused, and the three reasons want three different answers.

    An administrator at aal1 who holds a factor is not a stranger and does not
    need to go anywhere: they need to type six digits, so the form is here. That
    is not a convenience. `is_admin()` wants aal2 whatever `review_policy` says,
    and under the `off` setting nobody is ever challenged at the door — so
    without a way to ask for the code from inside, an administrator who switched
    the policy off could never reach the screen that switches it back. A setting
    you can only move one way is not a setting.

    With no factor at all there is nothing to type, so the sentence explains
    where enrolling happens. At aal2 the refusal is about the person, not the
    session, and saying "verify your code" to somebody who already has would
    send them round a loop they cannot leave.
  */
  if (!admin) {
    const canStepUp = strength.assurance === 'aal1' && verifiedCount(strength.factors) > 0;
    return (
      <Frame copy={copy}>
        <p className="rv-read rv-note-amber">
          {strength.assurance !== 'aal1'
            ? copy.people.notAdmin
            : canStepUp
              ? copy.people.stepUp
              : copy.people.needsFactor}
        </p>
        {canStepUp ? (
          <div style={{ paddingTop: '34px' }}>
            <StepUp label={copy.people.stepUpButton} />
          </div>
        ) : null}
      </Frame>
    );
  }

  const unenrolled = withoutFactor(rows);

  return (
    <Frame copy={copy}>
      <p className="rv-read" style={{ paddingBottom: '30px' }}>
        {copy.people.lead}
      </p>

      {error ? (
        <p className="rv-read rv-failed-detail rv-mono" style={{ marginBottom: '24px' }}>
          {error}
        </p>
      ) : null}
      {warning ? (
        <p className="rv-read rv-note-amber" style={{ marginBottom: '24px' }}>
          {warning}
        </p>
      ) : null}

      {/* ---------------------------------------------------------- the list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '44px' }}>
        {rows.map((row) => (
          <article
            key={row.email}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 24px',
              alignItems: 'baseline',
              padding: '18px 0',
              borderTop: '1px solid var(--rv-rule)',
            }}
          >
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div className="rv-row-title" style={{ overflowWrap: 'anywhere' }}>
                {row.email}
              </div>
              <div className="rv-label rv-quiet" style={{ paddingTop: '6px' }}>
                {row.isAdmin ? `${copy.people.colAdmin} · ` : ''}
                {copy.people.colFactor}: {row.hasFactor ? copy.people.yes : copy.people.no} ·{' '}
                {copy.people.colLastSeen}: {row.lastSignIn ? formatDate(row.lastSignIn) : copy.people.never}
              </div>
              {/*
                The half that fails silently everywhere else. A row with no
                account looks exactly like a working reviewer until the day they
                say the link never came.
              */}
              {!row.hasAccount ? (
                <div className="rv-label" style={{ paddingTop: '8px', color: 'var(--rv-red)' }}>
                  {copy.people.noAccount}
                </div>
              ) : null}
            </div>

            <div className="rv-actions" style={{ flex: '0 0 auto' }}>
              <button
                type="button"
                className="rv-btn-quiet"
                disabled={busy}
                onClick={() => void act('admin', row.email, !row.isAdmin)}
              >
                {row.isAdmin ? copy.people.demote : copy.people.promote}
              </button>
              {row.hasFactor ? (
                <button
                  type="button"
                  className="rv-btn-quiet"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(copy.people.resetMfaConfirm(row.email))) void act('reset-mfa', row.email);
                  }}
                >
                  {copy.people.resetMfa}
                </button>
              ) : null}
              {/*
                Removing yourself is refused by the server too. It is disabled
                here as well because a button that exists only to explain why it
                cannot be pressed is worse than one that is plainly not for you.
              */}
              <button
                type="button"
                className="rv-btn-quiet"
                disabled={busy || row.email.toLowerCase() === me}
                onClick={() => {
                  if (window.confirm(copy.people.removeConfirm(row.email))) void act('remove', row.email);
                }}
              >
                {copy.people.remove}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* ----------------------------------------------------------- add one */}
      <section className="rv-step" style={{ marginBottom: '44px' }}>
        <h2 className="rv-label-strong">{copy.people.addTitle}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-end', paddingTop: '16px' }}>
          <div style={{ flex: '1 1 280px' }}>
            <Text label={copy.people.addEmail} value={email} onChange={setEmail} type="email" />
          </div>
          <label className="rv-check">
            <input type="checkbox" checked={asAdmin} onChange={(event) => setAsAdmin(event.target.checked)} />
            <span>{copy.people.addAdmin}</span>
          </label>
          <button
            type="button"
            className="rv-btn"
            disabled={busy || !email.includes('@')}
            onClick={() => void onAdd()}
          >
            {copy.people.addButton}
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------- the door */}
      <section className="rv-step">
        <h2 className="rv-label-strong">{copy.people.doorTitle}</h2>
        <p className="rv-secondary" style={{ padding: '12px 0 18px' }}>
          {copy.people.doorLead}
        </p>
        <Segmented<SecondFactorPolicy>
          label={copy.people.doorTitle}
          value={policy}
          options={[
            { value: 'off', label: copy.people.doorOff },
            { value: 'enrolled', label: copy.people.doorEnrolled },
            { value: 'required', label: copy.people.doorRequired },
          ]}
          onChange={(next) => void onPolicy(next)}
        />
        {/*
          Said before the press, not after. Turning this to `required` while
          somebody has no factor does not lock them out permanently — enrolling
          is self-serve — but it does replace their queue with an enrol screen
          without warning, in the middle of whatever they were doing.
        */}
        {unenrolled > 0 ? (
          <p className="rv-read rv-note-amber" style={{ marginTop: '18px' }}>
            {copy.people.doorWarn(unenrolled)}
          </p>
        ) : null}
      </section>
    </Frame>
  );
}
