import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client, or null when the keys are absent.
 *
 * Null rather than a thrown error on purpose. This is a public website whose
 * content has a bundled fallback, so a missing or wrong key should cost you
 * the *live* content, not the page — a checkout with no .env.local still runs,
 * and a key rotated out from under production degrades to the last shipped
 * copy instead of a white screen.
 *
 * Both values are safe in client code: RLS lets the anon key read only rows
 * marked live, and insert only into the two form tables.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Untyped for now, and deliberately so: the `Database` type is generated from a
 * linked project, and importing a file that only appears after `npm run
 * db:types` would mean a fresh checkout could not typecheck. Once the generated
 * types are committed this becomes two lines —
 *
 *   import type { Database } from './database.types';
 *   createClient<Database>(...)
 *
 * — after which every `.from('news')` knows its own columns. See SUPABASE.md.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[IN] Supabase is not configured — rendering bundled content. ' +
      'Copy .env.example to .env.local to read live content.',
  );
}

/** Public bucket the story submission form uploads attachments to. */
export const STORY_MEDIA_BUCKET = 'story-media';
