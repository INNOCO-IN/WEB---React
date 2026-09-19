import type { DeskCopy } from './copy';

/**
 * Reading · empty · failed · the ambiguous desk.
 *
 * Each of these replaces the queue while leaving the header and the tab rail in
 * place, so the counts and the way out stay visible. They are together in one
 * file because the thing that matters about them is how they differ from each
 * other, and that is easier to keep true when they are read side by side.
 */

/** The queue's loading state. */
export function Reading({ copy }: { copy: DeskCopy }) {
  return (
    <div className="rv-state">
      <p className="rv-read rv-quiet">{copy.reading}</p>
    </div>
  );
}

/**
 * Nothing here — normal, and common.
 *
 * A sentence at display size on bare paper. Not an error, and not an
 * illustration: most weeks most queues are empty, and a screen that treats that
 * as an event would be wrong more often than it was right.
 */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rv-state">
      <p className="rv-read">{children}</p>
    </div>
  );
}

/**
 * A read that errored, which must not resemble an empty one.
 *
 * Told apart by shape rather than by wording: a rule down the left edge, the
 * database's own words in mono, and two ways out. An expired session is the
 * usual cause and signing in again fixes it. Red is used nowhere else in the
 * tool.
 */
export function Failed({
  copy,
  detail,
  onRetry,
  onSignIn,
}: {
  copy: DeskCopy;
  detail: string;
  onRetry: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="rv-state">
      <div className="rv-failed">
        <h2 className="rv-row-title">{copy.failedTitle}</h2>
        <p className="rv-read" style={{ padding: '14px 0 16px' }}>
          {copy.failedBody}
        </p>
        <p className="rv-failed-detail">{detail}</p>
        <div className="rv-actions">
          <button type="button" className="rv-btn" onClick={onRetry}>
            {copy.tryAgain}
          </button>
          <button type="button" className="rv-btn-secondary" onClick={onSignIn}>
            {copy.signInAgain}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Signed in, and the desk is empty — both readings kept.
 *
 * The database answers a refused read with an empty list rather than an error,
 * so "you have no permission" and "there is genuinely nothing" are
 * indistinguishable from the client. This screen says so, in both readings, on
 * purpose: it is the one screen a developer and a staff member read together,
 * and collapsing it to the likelier cause sends one of them to check the wrong
 * thing.
 *
 * No tabs and no counts above it. There is nothing to count.
 */
export function Ambiguous({ email }: { email: string }) {
  return (
    <div className="rv-state">
      <h2 className="rv-row-title">You are signed in as {email}, and this desk is empty.</h2>
      <p className="rv-read" style={{ padding: '18px 0 30px' }}>
        That is one of two things, and they look the same from here. The database answers a refused read with an
        empty list rather than an error, so this screen cannot tell them apart and does not guess.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <Reading1 />
        <Reading2 />
      </div>
    </div>
  );
}

function Reading1() {
  return (
    <div>
      <div className="rv-label rv-quiet" style={{ marginBottom: '8px' }}>
        Reading one
      </div>
      <p className="rv-secondary">
        The staff policies are not on this project yet — <code className="rv-mono">schema.sql</code> §2d, which
        creates <code className="rv-mono">is_staff()</code>. Run <code className="rv-mono">npm run db:types</code>:
        no <code className="rv-mono">is_staff</code> under Functions means it has not been applied.
      </p>
    </div>
  );
}

function Reading2() {
  return (
    <div>
      <div className="rv-label rv-quiet" style={{ marginBottom: '8px' }}>
        Reading two
      </div>
      <p className="rv-secondary">
        They are applied, and this address is not in <code className="rv-mono">staff_emails</code> — see{' '}
        <code className="rv-mono">seed-staff.sql</code>.
      </p>
    </div>
  );
}

/** Built without database keys. Developers only; a reviewer never sees this. */
export function NoKeys() {
  return (
    <div className="rv-state">
      <p className="rv-read">This build has no database keys, so there is nothing to review.</p>
      <p className="rv-secondary rv-muted" style={{ paddingTop: '16px' }}>
        Copy <code className="rv-mono">.env.example</code> to <code className="rv-mono">.env.local</code> and fill
        it in.
      </p>
    </div>
  );
}
