/**
 * Audits the page models against the live database.
 *
 *   node scripts/model-audit.mjs            report
 *   node scripts/model-audit.mjs --strict   exit non-zero if any read table is absent
 *
 * `content-map.mjs` checks the model against the routes; this checks it against
 * Supabase. Together they answer the two ways a model goes wrong: naming a page
 * that does not exist, and naming a table that does not exist.
 *
 * It reads with the anon key, which is the point — it sees exactly what a visitor
 * sees, so "18 rows" here means eighteen rows RLS will actually hand the site,
 * not eighteen rows in the table. A table that exists but returns nothing to anon
 * is reported as empty, because that is what the page will render.
 *
 * Realtime is deliberately not audited. A subscription to a table missing from
 * the `supabase_realtime` publication still reports SUBSCRIBED, and publication
 * membership is not visible to the anon key, so any claim this script made about
 * it would be a guess. Load a page and read the dev overlay instead.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes('--strict');

const { PAGE_MODELS } = await import(new URL('../src/lib/page-model.ts', import.meta.url).href);

/* ------------------------------------------------------------------- config */

function credentials() {
  const fromEnv = {
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_ANON_KEY,
  };
  if (fromEnv.url && fromEnv.key) return fromEnv;

  try {
    const text = readFileSync(join(HERE, '..', '.env.local'), 'utf8');
    const read = (name) => new RegExp(`^${name}=(.+)$`, 'm').exec(text)?.[1]?.trim();
    const url = read('VITE_SUPABASE_URL');
    const key = read('VITE_SUPABASE_ANON_KEY');
    if (url && key) return { url, key };
  } catch {
    /* fall through to the message below */
  }
  return null;
}

const creds = credentials();
if (!creds) {
  console.error('!! No Supabase keys. Copy app/.env.example to app/.env.local and fill it in.');
  process.exit(1);
}
const base = creds.url.replace(/\/$/, '');

/* -------------------------------------------------------------------- probe */

/** PostgREST's code for "that table is not in the schema cache". */
const ABSENT = new Set(['PGRST205', 'PGRST202', '42P01']);

async function probe(table) {
  let response;
  try {
    response = await fetch(`${base}/rest/v1/${table}?select=*&limit=0`, {
      headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}`, Prefer: 'count=exact' },
    });
  } catch (error) {
    return { state: 'unreachable', detail: error.message };
  }

  if (response.ok) {
    const range = response.headers.get('content-range') ?? '';
    const rows = Number.parseInt(range.split('/')[1] ?? '0', 10) || 0;
    return { state: rows ? 'live' : 'empty', rows };
  }

  const body = await response.text();
  let code = '';
  try {
    code = JSON.parse(body).code ?? '';
  } catch {
    code = `HTTP ${response.status}`;
  }
  if (ABSENT.has(code)) return { state: 'absent' };
  return { state: 'error', detail: code || `HTTP ${response.status}` };
}

/* ----------------------------------------------------------------- collect */

const readTables = new Set();
const writeTables = new Set();
for (const model of Object.values(PAGE_MODELS)) {
  for (const entry of model.reads ?? []) readTables.add(entry.table);
  for (const entry of model.writes ?? []) writeTables.add(entry.table);
}

const all = [...readTables, ...writeTables].sort();
const results = new Map();
await Promise.all(all.map(async (table) => results.set(table, await probe(table))));

/* ------------------------------------------------------------------ report */

const LABEL = {
  live: (r) => `live · ${r.rows} rows readable by anon`,
  empty: () => 'exists, but anon reads nothing — RLS, or no rows yet',
  absent: () => 'not in the database — the site renders its bundled copy',
  error: (r) => `error · ${r.detail}`,
  unreachable: (r) => `unreachable · ${r.detail}`,
};

const MARK = { live: '✓', empty: '·', absent: '✗', error: '!', unreachable: '!' };

console.log(`\nDatabase: ${base}\n`);
console.log('Tables the model names\n');

for (const table of all) {
  const result = results.get(table);
  const role = readTables.has(table) ? (writeTables.has(table) ? 'read+write' : 'read') : 'write';
  console.log(
    `  ${MARK[result.state]} ${table.padEnd(21)} ${role.padEnd(11)} ${LABEL[result.state](result)}`,
  );
}

// Write-only tables are supposed to be unreadable, so `empty` is the healthy
// state for them and saying otherwise would train people to ignore this output.
const writeOnly = [...writeTables].filter((t) => !readTables.has(t));
if (writeOnly.length) {
  console.log(
    `\n  ${writeOnly.join(', ')} ${writeOnly.length === 1 ? 'is' : 'are'} written and never read, ` +
      'so "anon reads nothing" is correct for them.',
  );
}

/* Per-page verdict: a page is live only when every table it reads is. */
const verdicts = { live: [], partial: [], bundled: [] };

for (const [route, model] of Object.entries(PAGE_MODELS)) {
  const reads = model.reads ?? [];
  if (!reads.length) continue;

  const states = reads.map((entry) => results.get(entry.table)?.state);
  if (states.every((state) => state === 'live')) verdicts.live.push(route);
  else if (states.some((state) => state === 'live')) verdicts.partial.push(route);
  else verdicts.bundled.push(route);
}

const total = verdicts.live.length + verdicts.partial.length + verdicts.bundled.length;
console.log(`\nPages that read a table: ${total}\n`);

const show = (title, routes) => {
  if (!routes.length) return;
  console.log(`  ${title} (${routes.length})`);
  for (const route of routes) console.log(`      ${route}`);
};

show('on the database', verdicts.live);
show('partly on the database', verdicts.partial);
show('on the bundled copy', verdicts.bundled);

const missing = all.filter((t) => readTables.has(t) && results.get(t).state === 'absent');
if (missing.length) {
  console.log(
    `\nTo put ${missing.join(', ')} in the database: cd app && npm run supabase-setup, ` +
      'then paste the file into the SQL Editor.',
  );
}

console.log('');
if (strict && missing.length) process.exit(1);
