/**
 * Regenerates src/lib/database.types.ts from the linked Supabase project.
 *
 *   cd app && npm run db:types
 *
 * A wrapper rather than a plain `supabase gen types ... > file` in package.json,
 * for two reasons.
 *
 * The redirection is the first. `>` truncates its target before the command on
 * the left has said whether it worked, so any failure — expired token, no link,
 * network — leaves an empty database.types.ts behind. The failure then reads as
 * hundreds of type errors across the app instead of the one-line auth problem it
 * actually is. Here the file is only written once the CLI has exited 0 and
 * returned something that looks like TypeScript, so a failed run costs nothing:
 * the previous types are still on disk.
 *
 * The second is that this CLI reports failures as a JSON envelope on *stdout* —
 * the same stream as the types themselves, with nothing on stderr:
 *
 *   {"_tag":"Error","error":{"code":"LegacyProjectNotLinkedError","message":...}}
 *
 * which is worth unwrapping, both because the raw envelope is a poor error
 * message and because the two common codes each have a one-command fix.
 *
 * Only `public` is generated. Storage is reached through the storage client,
 * which carries its own types, and auth is unused — the site is anonymous.
 *
 * **`--linked` means the hosted project, and that is a trap while work is
 * local.** A column that exists only on the local stack — because its migration
 * has been applied there and not pushed — is not in the hosted schema, so a run
 * of this script deletes it from the types without a word. The app then fails to
 * compile against a database that has the column, and the error names the app
 * rather than the gap. Five columns are in exactly that state today —
 * `news.edited_at` and `news.edited_by` (20260919104500_staff_edit_news.sql),
 * and `story_entries.wall_order`, `.edited_at` and `.edited_by`
 * (20260919160000_the_wall_on_story.sql) — so until those two migrations are
 * pushed, re-running this strips them and they have to go back by hand.
 *
 * The other half of the same problem is why this is not simply switched to
 * `--local`: the local stack is shared by every worktree on the machine, so it
 * carries columns from branches this one has never seen, and generating from it
 * would have the types claim columns this branch does not create.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');

const OUT = join(APP, 'src', 'lib', 'database.types.ts');
const ARGS = ['gen', 'types', 'typescript', '--linked', '--schema', 'public'];

/**
 * The CLI as installed by the `supabase` devDependency.
 *
 * Resolved from this file rather than taken from PATH so `node
 * scripts/db-types.mjs` behaves the same as `npm run db:types` — npm puts
 * node_modules/.bin on PATH, a bare node invocation does not.
 *
 * win32 needs shell: true because the shim there is a .cmd, which Node refuses
 * to spawn directly; that in turn is why the path is quoted, this repo living
 * under a directory with a space in it.
 */
const isWindows = process.platform === 'win32';
const bin = join(APP, 'node_modules', '.bin', isWindows ? 'supabase.cmd' : 'supabase');

const run = spawnSync(isWindows ? `"${bin}"` : bin, ARGS, {
  cwd: APP,
  encoding: 'utf8',
  shell: isWindows,
  maxBuffer: 32 * 1024 * 1024,
});

if (run.error) {
  console.error(`!! Could not run the Supabase CLI at ${relative(APP, bin)}`);
  console.error(`   ${run.error.message}`);
  console.error('   Is it installed?  cd app && npm install');
  process.exit(1);
}

const stdout = run.stdout ?? '';
const stderr = run.stderr ?? '';

/** Unwraps the `{"_tag":"Error",...}` envelope, or null if this isn't one. */
function envelope(text) {
  const line = text
    .trim()
    .split('\n')
    .find((l) => l.trimStart().startsWith('{'));
  if (!line) return null;

  try {
    const { error } = JSON.parse(line);
    if (error?.message) return { code: error.code ?? '', message: error.message };
  } catch {
    // Not the envelope — a stray brace, or types that happen to start with one.
  }
  return null;
}

/**
 * The generated file always declares types. An error envelope, an empty body or
 * a stray progress line does not, which is what makes this a usable guard
 * against writing garbage over a working database.types.ts.
 */
const looksLikeTypes = /^export (type|interface) /m.test(stdout);

if (run.status !== 0 || !looksLikeTypes) {
  const found = envelope(stdout) ?? envelope(stderr);

  if (found) {
    console.error(`!! ${found.message}`);
    if (found.code) console.error(`   (${found.code})`);
  } else {
    console.error(`!! supabase ${ARGS.join(' ')} exited ${run.status}`);
    const raw = (stderr.trim() || stdout.trim()).split('\n').slice(0, 10);
    if (raw[0]) console.error(raw.join('\n').replace(/^/gm, '   '));
  }

  // Route on the error code where there is one, the prose where there isn't.
  // Both fixes are a single command, so saying which beats leaving it to be
  // re-derived from "Cannot find project ref".
  const signal = `${found?.code ?? ''} ${found?.message ?? ''} ${stderr}`;
  if (/NotLinked|project ref|link your project/i.test(signal)) {
    console.error('\n   Not linked to a project yet:  npm run db:link');
  } else if (/Unauthorized|AccessToken|not logged in|login/i.test(signal)) {
    console.error('\n   No valid CLI session:  npm run db:login');
  }

  process.exit(run.status || 1);
}

let before = null;
try {
  before = readFileSync(OUT, 'utf8');
} catch {
  // First run — no previous file to compare against.
}

if (before === stdout) {
  console.log('src/lib/database.types.ts — unchanged (schema matches).');
  process.exit(0);
}

writeFileSync(OUT, stdout);

// Table names sit two levels into `public: { Tables: { ... } }`, so at six
// spaces of indent. Cosmetic: it only feeds the summary line.
const tables = [...stdout.matchAll(/^ {6}(\w+): \{$/gm)].map((m) => m[1]);
const lines = stdout.split('\n').length;

console.log(`src/lib/database.types.ts — ${lines} lines, ${before === null ? 'created' : 'updated'}.`);
if (tables.length) console.log(`  ${tables.length} tables: ${tables.join(', ')}`);
