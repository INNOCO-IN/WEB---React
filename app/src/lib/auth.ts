import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Assurance } from './second-factor';

/**
 * Sign-in, for the review desk and nothing else.
 *
 * The public site has no accounts and wants none: every page it serves is
 * readable by the anon key, and a visitor who submits a story is not signing
 * up for anything. This exists so that the two intake tables can be read by the
 * people who review them, without handing anyone the service-role key.
 *
 * **A link, never a password.** `signInWithOtp` mails a one-time link and the
 * session arrives when it is followed, so this app never has a password field,
 * never holds a secret, and has nothing to leak if the page is ever served from
 * somewhere it should not be. It also means the allowlist and the login are the
 * same fact: only a mailbox on `staff_emails` can reach anything, because RLS —
 * not this file — is what decides that. Signing in successfully and seeing
 * nothing is the correct outcome for someone who is not staff.
 */

/** A refused send, as `lib/sign-in.ts` needs to see it. */
export interface SignInFailure {
  message: string;
  code?: string;
}

export interface AuthState {
  session: Session | null;
  /** True until the first answer, so the page does not flash a sign-in form. */
  loading: boolean;
}

/**
 * The current session, kept in step with the tab.
 *
 * `onAuthStateChange` fires on sign-in, sign-out, and on the token refresh that
 * happens while a tab is left open, so the page does not need to poll and a
 * session that expires mid-review does not present as a silently empty list.
 */
export function useSession(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, loading: Boolean(supabase) });

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setState({ session: data.session, loading: false });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setState({ session, loading: false });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Mails a sign-in link back to this page.
 *
 * `shouldCreateUser: false` matters: without it, typing any address at all
 * creates an auth user, so the sign-in form becomes an open registration form
 * for a site that has no accounts. With it, an address nobody has invited gets
 * the same answer as one that exists — which is also why the caller says "check
 * your mail" either way rather than reporting whether the address was known.
 */
export async function sendSignInLink(
  email: string,
  redirectTo: string,
  /**
   * A Turnstile token, when this build has a CAPTCHA site key.
   *
   * Passed through to Supabase, which verifies it with Cloudflare server-side
   * — so unlike the widget itself this is not something the page can talk its
   * way past. Undefined when no key is configured; see `lib/captcha.ts` for why
   * that is a soft default and what it costs.
   */
  captchaToken?: string,
): Promise<SignInFailure | null> {
  if (!supabase) return { message: 'Supabase is not configured in this build.' };

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false, captchaToken },
  });

  // The code as well as the prose. `answerFor` decides from this whether the
  // form may repeat it, and an English sentence is a fragile thing to hang that
  // on -- the codes are stable where the wording is not.
  return error ? { message: error.message, code: error.code } : null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/* ------------------------------------------------------- the second factor */

/**
 * TOTP, and what the desk needs to know about it.
 *
 * The sign-in above is a mailed link, which means the first factor is a
 * mailbox — so whoever holds the mailbox holds the desk. That was the whole of
 * the door until `20260919180000_second_factor_on_the_desk.sql`, and this is
 * the half of the second factor that runs in the browser.
 *
 * **The other half is the one that matters.** `is_staff()` now asks whether the
 * JWT carries `aal2`, so a session that skipped the code is refused by the
 * database rather than by a screen. Everything here is about showing the right
 * screen and getting the token upgraded; none of it is what grants access, and
 * deleting all of it would lock reviewers out rather than let anybody in.
 */

/** A factor as the desk cares about it — Supabase's shape carries more. */
export interface Factor {
  id: string;
  friendlyName: string | null;
  /** `unverified` is a half-finished enrolment: a QR code nobody confirmed. */
  status: 'verified' | 'unverified';
}

export interface Strength {
  assurance: Assurance;
  factors: Factor[];
  loading: boolean;
  error: string | null;
}

/** Verified only. An abandoned enrolment must not stand between you and the desk. */
export function verifiedCount(factors: Factor[]): number {
  return factors.filter((factor) => factor.status === 'verified').length;
}

/**
 * How strong this session is, re-read whenever it changes.
 *
 * Bound to `onAuthStateChange` rather than read once, because verifying a code
 * replaces the token in place: the session object is the same user with a new
 * `aal`, so nothing else would tell the desk the gate had been passed and the
 * reviewer would sit looking at the code field they just satisfied.
 *
 * `getAuthenticatorAssuranceLevel` reads the token the client already holds, so
 * `currentLevel` is not a claim the page is making — it is the claim the
 * database will see on the next request. `listFactors` is a round trip, which
 * is why this reports `loading` rather than flashing an enrol screen at
 * somebody who has been enrolled for months.
 */
export function useStrength(session: Session | null): Strength {
  const [state, setState] = useState<Strength>({
    assurance: 'aal1',
    factors: [],
    loading: Boolean(supabase && session),
    error: null,
  });

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) {
      setState({ assurance: 'aal1', factors: [], loading: false, error: null });
      return;
    }

    /*
      Loading again, because the session almost never exists at mount.
      `useState` computed the initial `loading` from a session that was still
      null, so it said false; the read below then starts with `factors` empty
      and nothing marking it unread. A caller that trusts `loading` therefore
      gets one render of "signed in, zero factors" — and under the `required`
      policy `gateFor` reads that as `enrol` and offers a QR code to somebody
      who enrolled months ago. GoTrue refuses it ("AAL2 required to enroll a new
      factor"), so the flash is harmless to the account and invisible in the
      logs of anyone not looking, which is exactly why it survived.
    */
    setState((previous) => ({ ...previous, loading: true }));

    let cancelled = false;

    async function read() {
      if (!supabase) return;
      const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const list = await supabase.auth.mfa.listFactors();
      if (cancelled) return;

      // A failed read is reported, never defaulted. Defaulting to aal2 would
      // wave through a session the database is about to refuse; defaulting to
      // aal1 would ask somebody for a code they have already given. Both are
      // worse than saying the check did not complete.
      const failed = level.error?.message ?? list.error?.message ?? null;

      setState({
        assurance: level.data?.currentLevel === 'aal2' ? 'aal2' : 'aal1',
        factors: (list.data?.all ?? []).map((factor) => ({
          id: factor.id,
          friendlyName: factor.friendly_name ?? null,
          status: factor.status === 'verified' ? 'verified' : 'unverified',
        })),
        loading: false,
        error: failed,
      });
    }

    void read();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void read();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [userId]);

  return state;
}

/**
 * Clears half-finished enrolments — a QR code somebody closed the tab on.
 *
 * Supabase keeps every abandoned enrolment and refuses a duplicate friendly
 * name, so without this a reviewer who walked away once is met with "factor
 * already exists" and no way forward, which reads as the feature being broken
 * rather than as something they did.
 *
 * Verified factors are never touched. Those are somebody's actual second
 * factor, and a helper that quietly removed one would turn a retry into a
 * lockout.
 */
async function sweepUnverified(): Promise<void> {
  if (!supabase) return;
  const existing = await supabase.auth.mfa.listFactors();
  for (const factor of existing.data?.all ?? []) {
    if (factor.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
}

export interface Enrolment {
  factorId: string;
  /**
   * The QR code as an SVG data URL, drawn by Supabase and not by us.
   *
   * Worth knowing where this comes from: the alternative was a QR library in
   * the bundle, or — the tempting one — an image URL from a public QR service,
   * which would mean handing somebody else's server the TOTP secret in a query
   * string. That is the whole secret, in a URL, in someone's access log. This
   * arrives in the enrol response that already carries the secret, so it adds
   * no dependency and tells nobody anything they did not already have.
   */
  qrCode: string;
  /** The same secret in type-able form, for a desktop password manager. */
  secret: string;
}

/**
 * Starts an enrolment: mints a secret and returns it once.
 *
 * Deliberately callable at aal1 — that is what stops `required` from being a
 * trap. A reviewer who has never enrolled cannot reach aal2, so if enrolling
 * itself needed aal2 the policy would lock out the very people it is meant to
 * onboard and every one of them would need an admin. Here they let themselves in.
 *
 * A stale `unverified` factor is cleared first. Supabase keeps every abandoned
 * enrolment and refuses a duplicate friendly name, so a reviewer who closed the
 * tab at the QR code would otherwise be met with "factor already exists" and no
 * way forward — the failure looks like the feature being broken.
 */
export async function beginEnrolment(friendlyName: string): Promise<{ enrolment: Enrolment | null; error: string | null }> {
  if (!supabase) return { enrolment: null, error: 'Supabase is not configured in this build.' };

  await sweepUnverified();

  let { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName });

  // `mfa_factor_name_conflict` means an enrolment under this name got there
  // first — a second tab, or the same effect running twice, which React does in
  // development by design. The sweep above cannot prevent it, because two calls
  // that both sweep and then both enrol still race; so the answer is to lose
  // the race gracefully rather than to try to win it. Sweeping again clears
  // whichever unverified factor landed, and the retry takes its place.
  //
  // Only ever unverified ones. A *verified* factor holding this name means the
  // reviewer already has what this screen is trying to give them, and the
  // second attempt failing is then the correct outcome.
  if (error && /name_conflict|already exists/i.test(error.message)) {
    await sweepUnverified();
    ({ data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName }));
  }

  if (error) return { enrolment: null, error: error.message };
  if (!data) return { enrolment: null, error: 'The server returned no enrolment.' };

  return {
    enrolment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
    error: null,
  };
}

/**
 * Finishes an enrolment, or answers a challenge. One call for both.
 *
 * `challengeAndVerify` is the pair of requests Supabase documents separately,
 * and keeping them together here is not only brevity: a challenge has a short
 * life, so minting one at render time and verifying it whenever the reviewer
 * finishes typing is how you get an expired-challenge error from a perfectly
 * good code. Minted at the moment of the answer, it cannot go stale in a pocket.
 *
 * On success the session is replaced with an aal2 one, `onAuthStateChange`
 * fires, and `useStrength` re-reads — so no caller has to hand the new token
 * anywhere.
 */
export async function verifyCode(factorId: string, code: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured in this build.';

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return error ? error.message : null;
}

/**
 * Removes a factor.
 *
 * Only ever the caller's own — Supabase scopes this to the session's user, so
 * there is no admin path here and there should not be: taking somebody else's
 * factor off is what `scripts/mfa-reset.mjs` and the service-role key are for,
 * and it wants a person who can check who is asking.
 */
export async function removeFactor(factorId: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured in this build.';

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return error ? error.message : null;
}
