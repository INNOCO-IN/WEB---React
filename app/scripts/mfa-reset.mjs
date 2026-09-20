/**
 * Lists or removes a reviewer's second factor, for the day the phone is gone.
 *
 *   node scripts/mfa-reset.mjs you@example.com                 # list, changes nothing
 *   node scripts/mfa-reset.mjs you@example.com --remove        # take them all off
 *   node scripts/mfa-reset.mjs you@example.com --remove --live # ...on the hosted project
 *
 * The desk has no self-serve recovery and must not grow one. Everything a
 * reviewer could prove on that screen — control of the mailbox — is the first
 * factor, so a "lost your device?" button there would be a second door opened
 * by the same key, and the second factor would be decoration. Recovery is
 * therefore deliberately a person: somebody with the service-role key who can
 * satisfy themselves about who is asking, by some channel that is not email.
 *
 * Removing a factor puts the reviewer back where a new starter is. Under the
 * `required` policy their next sign-in shows the enrol screen; under `enrolled`
 * they are simply let in and offered a new one. Either way nothing is granted
 * here — `staff_emails` is still what says who may read anything.
 *
 * **It needs the service-role key, which bypasses RLS entirely.** Same source
 * and same rules as `dev-signin-link.mjs`: `app/.env.devdb` (local; committed,
 * because those keys only address 127.0.0.1) or `app/.env.local` (hosted;
 * gitignored), as `SUPABASE_SERVICE_ROLE_KEY` — no `VITE_` prefix, because Vite
 * puts every `VITE_*` variable in the browser bundle and this one must never
 * get there.
 *
 * Local by default, `--live` for the hosted project, for the reason that script
 * gives: `--remove` writes, and the cost of guessing wrong is a reviewer in
 * production locked out of the desk with no idea why.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { readEnvFiles, isLocalUrl } from './lib/env-files.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');

/** Vite's env files, in the precedence Vite itself would give them. */
function env(live) {
  return readEnvFiles(APP, live ? ['.env.local'] : ['.env.local', '.env.devdb']);
}

const [, , email, ...rest] = process.argv;
const remove = rest.includes('--remove');
const live = rest.includes('--live');

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/mfa-reset.mjs you@example.com [--remove] [--live]');
  process.exit(1);
}

const { values, from } = env(live);
const vars = { ...values, ...process.env };
const url = vars.VITE_SUPABASE_URL;
const serviceKey = vars.SUPABASE_SERVICE_ROLE_KEY;
const source = live ? 'app/.env.local' : 'app/.env.devdb or app/.env.local';

const origin = (name) => (process.env[name] ? 'the environment' : from[name] ? `app/${from[name]}` : source);

if (!url) {
  console.error(`No VITE_SUPABASE_URL in ${source}.`);
  if (!live) console.error('For the local stack: npx supabase start --workdir app, then npm run db:env');
  process.exit(1);
}

// Which database, said before anything is done to it, and said as where the
// address came from rather than as a label.
console.error(`Project: ${url}   (${origin('VITE_SUPABASE_URL')}${live ? ', --live' : ''})`);

if (!live && !isLocalUrl(url)) {
  console.error(
    [
      '',
      'Refusing to run: that is not a local stack, and --live was not passed.',
      '',
      'app/.env.devdb is what points this at the Supabase on your machine, and',
      'nothing in it was read — so what answered was app/.env.local underneath.',
      '',
      '  npx supabase start --workdir app',
      '  npm --prefix app run db:env',
      '',
      'Or pass --live if the hosted project is genuinely what you meant.',
    ].join('\n'),
  );
  process.exit(1);
}

if (!serviceKey) {
  console.error(
    [
      `No SUPABASE_SERVICE_ROLE_KEY in ${source}.`,
      '',
      'Supabase → Project Settings → API → service_role. Add it as:',
      '',
      '  SUPABASE_SERVICE_ROLE_KEY=...',
      '',
      'Without a VITE_ prefix — that prefix is what puts a variable in the',
      'browser bundle, and this key bypasses RLS on every table.',
    ].join('\n'),
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * The auth user behind an address.
 *
 * `listUsers` is paged and there is no admin lookup by email, so this walks. A
 * staff list is tens of people, not thousands, and stopping at the first page
 * would silently report "no such user" for whoever sorted last — which on this
 * script reads as "they never had a factor" and sends somebody to debug the
 * wrong thing entirely.
 */
async function findUser(address) {
  const wanted = address.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { user: null, error: error.message };

    const hit = (data?.users ?? []).find((user) => (user.email ?? '').toLowerCase() === wanted);
    if (hit) return { user: hit, error: null };
    if ((data?.users ?? []).length < 200) break;
  }
  return { user: null, error: null };
}

const { user, error: lookupError } = await findUser(email);

if (lookupError) {
  console.error(`Could not read the user list: ${lookupError}`);
  process.exit(1);
}

if (!user) {
  console.error(`\nNo auth user for ${email} on this project.`);
  console.error('Being on staff_emails is a separate thing — see SUPABASE.md.');
  process.exit(1);
}

const { data: factorData, error: factorError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });

if (factorError) {
  console.error(`Could not read that user's factors: ${factorError.message}`);
  process.exit(1);
}

const factors = factorData?.factors ?? [];

if (factors.length === 0) {
  console.error(`\n${email} has no second factor registered.`);
  console.error(
    remove
      ? 'Nothing to remove. Under the `required` policy their next sign-in is the enrol screen.'
      : 'Under the `required` policy their next sign-in is the enrol screen.',
  );
  process.exit(0);
}

console.error(`\n${email} — ${factors.length} factor${factors.length === 1 ? '' : 's'}:\n`);
for (const factor of factors) {
  const name = factor.friendly_name ?? '(unnamed)';
  console.error(`  ${factor.status.padEnd(10)} ${String(factor.factor_type).padEnd(8)} ${name}`);
  console.error(`  ${' '.repeat(10)} ${factor.id}   created ${factor.created_at}`);
}

// Listing is the default because this script is reached in a hurry, by someone
// who has just been told a story about a lost phone. Seeing what is actually
// registered before deleting it is the cheap half of the job.
if (!remove) {
  console.error('\nNothing was changed. Re-run with --remove to take these off.');
  process.exit(0);
}

let failed = 0;
for (const factor of factors) {
  const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
  if (error) {
    console.error(`\nCould not remove ${factor.id}: ${error.message}`);
    failed += 1;
  }
}

if (failed > 0) process.exit(1);

console.error(`\nRemoved ${factors.length} factor${factors.length === 1 ? '' : 's'} from ${email}.`);
console.error('Their next sign-in enrols a new one. Nothing else about their access changed.');
