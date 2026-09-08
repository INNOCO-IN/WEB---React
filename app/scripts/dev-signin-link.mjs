/**
 * Prints a working sign-in link for /review, without sending any mail.
 *
 *   node scripts/dev-signin-link.mjs you@example.com
 *   node scripts/dev-signin-link.mjs you@example.com --create
 *   node scripts/dev-signin-link.mjs you@example.com --live
 *
 * The magic-link flow needs mail to work, and on a hosted Supabase project the
 * built-in mailer is rate-limited to a handful an hour and is not meant for
 * real delivery — so in development the link never arrives and there is nothing
 * to click. The link itself is not a secret the browser could print either: the
 * client asks for one to be *sent* and never sees it.
 *
 * The admin API can mint the same link directly, so that is what this does. It
 * runs on your machine, prints the link, and sends nothing.
 *
 * **It targets the local stack by default, the same as `npm run dev`.** `--live`
 * is what points it at the hosted project, and that is a flag rather than the
 * default because `--create` writes: run it against the wrong database and there
 * is a real auth user in the live project to go and delete. It names the project
 * it is talking to either way.
 *
 * Against the local stack you barely need this script — that stack catches its
 * own mail at http://127.0.0.1:54324, so the real mailed-link flow works there.
 * It stays useful for `--create`, and for `--live`.
 *
 * **The key it needs is the service-role key, which bypasses RLS entirely.**
 * It comes from `app/.env.devdb` (the local stack; committed, because those keys
 * only address 127.0.0.1) or `app/.env.local` (the hosted project; gitignored),
 * as `SUPABASE_SERVICE_ROLE_KEY` — deliberately without a `VITE_` prefix, because
 * Vite exposes every `VITE_*` variable to the browser and this one must never
 * reach it. Nothing under `src/` reads it.
 *
 * `--create` also creates the auth user when there is not one yet, which is the
 * other half of adding a reviewer (`shouldCreateUser: false` on the sign-in form
 * means it will not do that for you). Being on `staff_emails` is separate again,
 * and is what RLS actually checks — see seed-staff.sql.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');

/**
 * Vite's env files are Vite's to load, not Node's — so read them here, in the
 * order and with the precedence Vite itself would give them.
 *
 * Default is `.env.local` then `.env.devdb` overriding it, which is what
 * `vite --mode devdb` does and therefore what `npm run dev` is pointed at.
 * `--live` reads `.env.local` alone, matching `npm run dev:live`.
 */
function env(live) {
  const files = live ? ['.env.local'] : ['.env.local', '.env.devdb'];
  const out = {};

  for (const file of files) {
    let text;
    try {
      text = readFileSync(join(APP, file), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      out[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const [, , email, ...rest] = process.argv;
const create = rest.includes('--create');
const live = rest.includes('--live');
const redirectTo = (rest.find((arg) => arg.startsWith('--redirect=')) ?? '').split('=')[1]
  || 'http://localhost:5174/review';

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/dev-signin-link.mjs you@example.com [--create] [--live] [--redirect=URL]');
  process.exit(1);
}

const vars = { ...env(live), ...process.env };
const url = vars.VITE_SUPABASE_URL;
const serviceKey = vars.SUPABASE_SERVICE_ROLE_KEY;

const source = live ? 'app/.env.local' : 'app/.env.devdb or app/.env.local';

if (!url) {
  console.error(`No VITE_SUPABASE_URL in ${source}.`);
  if (!live) {
    console.error('For the local stack: npx supabase start --workdir app, then npm run db:env');
  }
  process.exit(1);
}

// Which database this is about to write to, said before it writes to it.
console.error(`Project: ${url}${live ? ' (hosted — --live)' : ' (local)'}`);

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

if (create) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  // "already been registered" is the outcome we want from --create on a second
  // run, so it is not a failure.
  if (error && !/already been registered|already exists/i.test(error.message)) {
    console.error(`Could not create the auth user: ${error.message}`);
    process.exit(1);
  }
  console.error(error ? `Auth user already existed: ${email}` : `Auth user created: ${email}`);
}

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo },
});

if (error) {
  console.error(`Could not generate a link: ${error.message}`);
  if (/user not found|not found/i.test(error.message)) {
    console.error('\nThere is no auth user for that address yet. Re-run with --create.');
  }
  process.exit(1);
}

const link = data?.properties?.action_link;
if (!link) {
  console.error('The admin API returned no action_link.');
  process.exit(1);
}

// The link on stdout and everything else on stderr, so it can be piped.
console.error(`\nSign-in link for ${email} — opens ${redirectTo}.`);
console.error('Single use, and it expires. Nothing was emailed.\n');
console.log(link);
console.error(
  '\nSigning in is not the same as being allowed in: RLS checks `staff_emails`,\n' +
    'so apply seed-staff.sql too or the desk will be empty.',
);
