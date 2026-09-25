/**
 * The two ways an administrator can lock everybody out, and the refusals.
 *
 * Split out of `roster.js` so they can be tested. They are guards on a
 * privileged endpoint, so they have to live on the server side of the wire --
 * `People.tsx` disables the same buttons, but a disabled button is a courtesy
 * and this is the rule. Extracting them does not move the authority anywhere;
 * it only makes the authority readable by a test.
 *
 * Both failures are quiet and permanent if they get through. Removing the only
 * administrator leaves an allowlist that nobody may change, which can then only
 * be repaired with the service-role key from a terminal -- exactly the thing
 * this screen exists to stop being necessary.
 *
 * CommonJS, no imports: `api/` has no package.json and no build step. See the
 * header of `roster.js`.
 */

/** Addresses are compared case-insensitively, the way `is_staff()` compares them. */
function same(a, b) {
  return (a || '').toLowerCase() === (b || '').toLowerCase();
}

function isAdmin(email, admins) {
  return (admins || []).some((entry) => same(entry, email));
}

/**
 * `null` when the removal may go ahead, otherwise the sentence to show.
 *
 * `by` is the caller, and may be null when their address could not be read off
 * the token. That weakens the self-check and nothing else: the last-administrator
 * rule below does not depend on knowing who is asking, and it is the one that
 * protects against an allowlist nobody can edit.
 */
function whyNotRemove({ target, by, admins }) {
  if (by && same(target, by)) return 'You cannot remove yourself. Ask another administrator.';
  if (isAdmin(target, admins) && admins.length === 1) {
    return 'That is the only administrator. Promote somebody else first.';
  }
  return null;
}

/**
 * `null` when the demotion may go ahead, otherwise the sentence to show.
 *
 * Only refused when the target actually holds the flag. Demoting somebody who
 * is not an administrator is a no-op, and answering it with "that is the only
 * administrator" would be both wrong and confusing -- it names a danger that is
 * not there while saying nothing about what did happen.
 */
function whyNotDemote({ target, by, admins }) {
  if (by && same(target, by)) return 'You cannot take away your own administrator rights.';
  if (isAdmin(target, admins) && admins.length === 1) {
    return 'That is the only administrator. Promote somebody else first.';
  }
  return null;
}

module.exports = { same, isAdmin, whyNotRemove, whyNotDemote };
