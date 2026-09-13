/**
 * Vite's env files, read from Node.
 *
 * `dev-signin-link.mjs` and `promote-watch.mjs` both need the keys that
 * `npm run dev` runs on, and neither of them is Vite — so they read the files
 * themselves, in the order and with the precedence Vite would give them. They
 * used to do that with a copy of the loop each, which is how they came to
 * share a bug.
 *
 * The line pattern ends in `$`, and on a Windows checkout every line ends in
 * `\r` first: JavaScript's `.` does not match a carriage return and a `$`
 * without the `m` flag only matches the very end of the string, so every line
 * failed and the file parsed to nothing. Silently — a file that contributes no
 * keys looks exactly like a file that is not there.
 *
 * The file that lands as CRLF is `.env.devdb`, because it is the committed one
 * and git converts on checkout (`core.autocrlf` is true on Windows by
 * default). So the file that went missing was always the *local* stack, and
 * what was left underneath it was the hosted project — which is the reverse of
 * what either caller wants by default. Hence `isLocalUrl` below: parsing right
 * is not the same as having read the file you think you read, and both scripts
 * would rather stop than guess.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Hostnames that mean "the Supabase running on this machine". */
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1', '[::1]'];

/**
 * The variables `files` set, later files winning, as Vite would resolve them.
 *
 * Returns `from` alongside the values: which file each key's winning value came
 * out of. A caller that layers a local file over a hosted one cannot otherwise
 * tell whether the local one contributed, and saying "local" when it did not is
 * the failure this module exists to have stopped.
 *
 * A file that is not there is skipped, not an error — that is what layering
 * means. `files` are relative to `dir`.
 */
export function readEnvFiles(dir, files) {
  const values = {};
  const from = {};

  for (const file of files) {
    let text;
    try {
      text = readFileSync(join(dir, file), 'utf8');
    } catch {
      continue;
    }

    // Split on either ending, so a line never arrives carrying a `\r` that the
    // pattern below would then have to survive.
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      from[match[1]] = file;
    }
  }

  return { values, from };
}

/** Whether a Supabase URL addresses a stack on this machine. */
export function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}
