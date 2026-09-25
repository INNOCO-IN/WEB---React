/**
 * Who reaches the desk — read from the database, changed through the server.
 *
 * The asymmetry is the whole shape of this file and it is deliberate. Reads go
 * straight to Postgres as the signed-in reviewer, because `roster()` is
 * `security definer` and decides for itself whether to answer. Writes go to
 * `/api/roster`, because they need the service-role key to create the auth user
 * half of a reviewer, and that key cannot be in a bundle that ships to
 * browsers.
 *
 * So there is no function here that writes `staff_emails`. There is no policy
 * that would let one — the table has had no insert, update or delete policy
 * since 20260903090000 and still does not. A compromised session cannot add an
 * accomplice by talking to PostgREST directly, which was true before this
 * screen existed and has to stay true after it.
 */

import { supabase } from '../supabase';
import type { SecondFactorPolicy } from '../second-factor';

export interface RosterEntry {
  email: string;
  isAdmin: boolean;
  addedAt: string;
  addedBy: string | null;
  /** False means an address that can never receive a link — the silent half. */
  hasAccount: boolean;
  hasFactor: boolean;
  lastSignIn: string | null;
}

const NO_KEYS = 'This build has no database keys.';

/**
 * Whether this session may manage people.
 *
 * Asked of the database rather than derived from anything the page knows, for
 * the same reason the desk asks `is_staff()`: the answer depends on the `aal`
 * claim in the token, which is a fact about the session that the browser can
 * read but must not be the one to decide.
 */
export async function amAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export async function fetchRoster(): Promise<{ rows: RosterEntry[]; error: string | null }> {
  if (!supabase) return { rows: [], error: NO_KEYS };

  const { data, error } = await supabase.rpc('roster');
  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((row) => ({
      email: row.email,
      isAdmin: row.is_admin,
      addedAt: row.added_at,
      addedBy: row.added_by,
      hasAccount: row.has_account,
      hasFactor: row.has_factor,
      lastSignIn: row.last_sign_in,
    })),
    error: null,
  };
}

/** How many on the list could not get in if the policy went to `required`. */
export function withoutFactor(rows: RosterEntry[]): number {
  return rows.filter((row) => !row.hasFactor).length;
}

export type RosterAction = 'add' | 'remove' | 'admin' | 'reset-mfa';

export interface RosterOutcome {
  error: string | null;
  /** Said when the row landed but the account did not — see `api/roster.js`. */
  warning?: string;
}

/**
 * One change, made by the server on this session's behalf.
 *
 * The token is sent so the endpoint can ask the database `is_admin()` about
 * *this caller* before it uses a key that answers to nobody. Nothing here
 * claims a privilege; it offers a token and lets Postgres decide.
 */
export async function changeRoster(
  action: RosterAction,
  email: string,
  isAdmin?: boolean,
): Promise<RosterOutcome> {
  if (!supabase) return { error: NO_KEYS };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'This session has expired. Sign in again.' };

  let res: Response;
  try {
    res = await fetch('/api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, email, isAdmin }),
    });
  } catch (cause) {
    return { error: `Could not reach the server: ${(cause as Error).message}` };
  }

  // The dev server has no functions — Vite serves the SPA shell for every path,
  // so an unparseable body here means "you are running `npm run dev`", not that
  // anything is broken. Saying which is the difference between a five-minute
  // confusion and an afternoon of it.
  const text = await res.text();
  let body: RosterOutcome & Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return {
      error:
        'The server endpoint did not answer. `/api/roster` only exists on a deployment — ' +
        'the local dev server serves the page shell for every path, so this screen can read but not change anything here.',
    };
  }

  if (!res.ok) return { error: typeof body.error === 'string' ? body.error : `Refused (${res.status}).` };
  return { error: null, warning: typeof body.warning === 'string' ? body.warning : undefined };
}

/**
 * The door setting.
 *
 * An RPC rather than an update, because `review_policy` is readable by anyone
 * signed in and writable by nobody — the guard against a compromised session
 * turning off its own second factor. `set_second_factor()` demands `is_admin()`,
 * which demands aal2, so the setting cannot be weakened by the break it exists
 * to defend against.
 */
export async function saveSecondFactor(next: SecondFactorPolicy): Promise<string | null> {
  if (!supabase) return NO_KEYS;
  const { error } = await supabase.rpc('set_second_factor', { wanted: next });
  return error ? error.message : null;
}
