/**
 * The one place that may change who reaches the review desk.
 *
 * Adding a reviewer is two halves and the browser can only do one of them. A
 * row in `staff_emails` decides what somebody may *see*; an auth user decides
 * whether they can *receive a link*. The second needs the service-role key,
 * which bypasses RLS on every table and therefore cannot be in the bundle. A
 * client-side People screen would write the allowlist and stop there, and the
 * person invited would wait for a link that was never going to arrive --
 * silently, because nothing in that path reports it.
 *
 * So this runs on the server, holds the key, and does both halves in one call.
 *
 * **It never trusts the caller's word about who they are.** The request carries
 * the reviewer's own access token; before anything happens, that token is sent
 * to `rpc/is_admin` with the *anon* key, so the database decides -- the same
 * `is_admin()` the desk's own screens ask, which requires aal2 and a row
 * flagged `is_admin`. A forged or expired token fails there. Only after that
 * does the service-role key get used, and only for the action requested.
 *
 * Deliberately dependency-free. There is no package.json at the repository root
 * -- `installCommand` installs into `app/` -- so a function here cannot import
 * `@supabase/supabase-js`. It does not need to: the admin API and PostgREST are
 * both plain HTTP, and `fetch` is in the runtime. CommonJS for the same reason:
 * without a root package.json declaring `"type": "module"`, `export default`
 * would not parse.
 *
 * `vercel.json` sends everything to `/index.html` for React Router, so it needs
 * an exception for `/api/` or this file is never reached -- the SPA shell is
 * served instead and the fetch returns HTML.
 */

const { whyNotRemove, whyNotDemote } = require('./rules');

const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** PostgREST and GoTrue, as the caller. Proves the token is real. */
async function asCaller(path, token, init = {}) {
  return fetch(`${URL_}${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

/** The same, with the key that bypasses RLS. Only after is_admin() said yes. */
async function asService(path, init = {}) {
  return fetch(`${URL_}${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

/**
 * The caller's own address, for the `added_by` column.
 *
 * Read out of the token without verifying it, which is safe only because
 * `is_admin()` has already answered true for this exact token -- an unverified
 * read here decides a label, never an access question.
 */
function emailInToken(token) {
  try {
    const body = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof body.email === 'string' ? body.email : null;
  } catch {
    return null;
  }
}

async function findUser(email) {
  const res = await asService(`/auth/v1/admin/users?per_page=200`);
  if (!res.ok) return null;
  const body = await res.json();
  return (body.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function admins() {
  const res = await asService(`/rest/v1/staff_emails?select=email&is_admin=eq.true`);
  return res.ok ? await res.json() : [];
}

/* --------------------------------------------------------------- the actions */

async function add(email, makeAdmin, by) {
  // The allowlist first. If this fails there is nothing to undo; if the account
  // step fails afterwards, the row is harmless on its own -- an address that
  // cannot yet receive a link, which is exactly what the screen will report.
  const row = await asService('/rest/v1/staff_emails', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ email, is_admin: Boolean(makeAdmin), added_by: by }),
  });
  if (!row.ok) return { error: `Could not add to the allowlist: ${await row.text()}` };

  const existing = await findUser(email);
  if (existing) return { ok: true, account: 'existed' };

  const made = await asService('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (!made.ok) {
    return {
      ok: true,
      account: 'failed',
      warning:
        `On the allowlist, but the account could not be created: ${await made.text()}. ` +
        'Until it exists this address cannot receive a sign-in link.',
    };
  }
  return { ok: true, account: 'created' };
}

async function remove(email, by) {
  const refused = whyNotRemove({ target: email, by, admins: (await admins()).map((a) => a.email) });
  if (refused) return { error: refused };

  // The allowlist row only. The auth user is left alone on purpose: removing
  // the row is what revokes access -- is_staff() is false the moment it is gone
  // -- and it is reversible, where deleting an account is not. A leftover
  // account can request links all day and still read nothing.
  const res = await asService(`/rest/v1/staff_emails?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE' });
  if (!res.ok) return { error: `Could not remove: ${await res.text()}` };
  return { ok: true };
}

async function setAdmin(email, makeAdmin, by) {
  if (!makeAdmin) {
    const refused = whyNotDemote({ target: email, by, admins: (await admins()).map((a) => a.email) });
    if (refused) return { error: refused };
  }
  const res = await asService(`/rest/v1/staff_emails?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_admin: Boolean(makeAdmin) }),
  });
  if (!res.ok) return { error: `Could not change that: ${await res.text()}` };
  return { ok: true };
}

/**
 * The day the phone is gone.
 *
 * Verified factors only get removed here, and removing one puts the reviewer
 * back where a new starter is: under `required` they meet the enrol screen,
 * under `enrolled` they are let in and offered a new factor. Nothing is
 * granted -- `staff_emails` still decides what they can see.
 *
 * `scripts/mfa-reset.mjs` does the same thing from a terminal and stays, because
 * the person who needs it may be the only administrator and may be the one who
 * lost the phone.
 */
async function resetMfa(email) {
  const user = await findUser(email);
  if (!user) return { error: 'There is no account for that address.' };

  const factors = (user.factors || []).filter((f) => f.status === 'verified');
  for (const factor of factors) {
    const res = await asService(`/auth/v1/admin/users/${user.id}/factors/${factor.id}`, { method: 'DELETE' });
    if (!res.ok) return { error: `Could not remove a factor: ${await res.text()}` };
  }
  return { ok: true, removed: factors.length };
}

/* ---------------------------------------------------------------- the handler */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only.' });
  }
  if (!URL_ || !ANON || !SERVICE) {
    // Named rather than generic: the missing one is almost always the service
    // key, because it is the only one that is not already in the bundle.
    return res.status(500).json({
      error:
        'This deployment has no server-side Supabase configuration. ' +
        'SUPABASE_SERVICE_ROLE_KEY must be set on the project, without a VITE_ prefix.',
    });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer /i, '');
  if (!token) return res.status(401).json({ error: 'Not signed in.' });

  const check = await asCaller('/rest/v1/rpc/is_admin', token, { method: 'POST', body: '{}' });
  if (!check.ok || (await check.json()) !== true) {
    return res.status(403).json({
      error:
        'Administrators only, and the session has to carry a second factor. ' +
        'If you are an administrator, verify your code and try again.',
    });
  }

  const by = emailInToken(token);
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'That is not an address.' });

  let out;
  switch (body.action) {
    case 'add':      out = await add(email, body.isAdmin, by); break;
    case 'remove':   out = await remove(email, by); break;
    case 'admin':    out = await setAdmin(email, body.isAdmin, by); break;
    case 'reset-mfa':out = await resetMfa(email); break;
    default:         return res.status(400).json({ error: `Unknown action: ${body.action}` });
  }

  return res.status(out.error ? 400 : 200).json(out);
};
