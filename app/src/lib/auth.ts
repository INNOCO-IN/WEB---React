import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

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
export async function sendSignInLink(email: string, redirectTo: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured in this build.';

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });

  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
