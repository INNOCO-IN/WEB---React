import { supabase } from '../supabase';
import type { Database } from '../database.types';

/**
 * Reads and writes for the review desk.
 *
 * Separate from `services/content.ts` on purpose. That file is the public
 * site's reader: it falls back to bundled copy, reports which copy a page is
 * showing, and treats an error as "show the visitor something anyway". None of
 * that is right here. A reviewer looking at an empty list needs to know whether
 * the list is empty or the query failed, and there is no bundled copy of what
 * someone sent this morning — so every function here returns the error instead
 * of swallowing it.
 *
 * Nothing in this file grants access. RLS does, through `is_staff()`; signing
 * in and receiving an empty list is the correct experience for someone who is
 * not on the allowlist.
 */

export type IntakeTable = 'stories' | 'submissions' | 'workshop_registrations';

export type StoryRow = Database['public']['Tables']['stories']['Row'];
export type SubmissionRow = Database['public']['Tables']['submissions']['Row'];
export type RegistrationRow = Database['public']['Tables']['workshop_registrations']['Row'];

/**
 * What each table's `status` may become, in the order a reviewer moves through.
 *
 * The database stores these as free text with a default rather than an enum, so
 * this is the app's copy of a vocabulary the schema does not enforce. Keep the
 * two in step: a status invented here would be written happily and then match
 * no filter anywhere.
 */
export const STATUSES: Record<IntakeTable, readonly string[]> = {
  stories: ['pending', 'published', 'declined'],
  submissions: ['new', 'contacted', 'archived'],
  workshop_registrations: ['new', 'contacted', 'archived'],
};

/** The status a row arrives with — the head of each queue. */
export const INBOX: Record<IntakeTable, string> = {
  stories: 'pending',
  submissions: 'new',
  workshop_registrations: 'new',
};

export interface Result<T> {
  rows: T[];
  /** Null when the read succeeded, including when it succeeded with no rows. */
  error: string | null;
}

const NOT_CONFIGURED = 'This build has no Supabase keys, so there is nothing to review.';

/**
 * One table's rows, newest first.
 *
 * No status filter: a reviewer needs to see what was declined last week as
 * readily as what arrived today, and these tables are small enough that paging
 * them would be ceremony. The page groups them.
 */
export async function fetchIntake<T>(table: IntakeTable, limit = 200): Promise<Result<T>> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as T[], error: null };
}

/**
 * Moves one row through review.
 *
 * Returns the error rather than throwing, because the caller is a button and
 * the honest response to a failed write is to put the row back the way it was
 * and say why — not to leave the list showing a change the database refused.
 */
export async function setStatus(table: IntakeTable, id: string, status: string): Promise<string | null> {
  if (!supabase) return NOT_CONFIGURED;
  if (!STATUSES[table].includes(status)) return `"${status}" is not a status for ${table}.`;

  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  return error ? error.message : null;
}

/**
 * Whether the signed-in address is on the allowlist.
 *
 * Asked so the page can tell "you are not staff" apart from "there is nothing
 * to review", which look identical through RLS — both are an empty list. The
 * allowlist has its own staff-only read policy, so a non-staff session gets
 * nothing back here too, which is the answer.
 */
export async function isStaff(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from('staff_emails').select('email').limit(1);
  return !error && (data?.length ?? 0) > 0;
}
