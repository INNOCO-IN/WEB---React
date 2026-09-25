import rules from './rules.js';

const { whyNotRemove, whyNotDemote } = rules;

/**
 * The guards on `/api/roster`, which are the only thing standing between an
 * administrator and an allowlist nobody may edit.
 *
 * Tested here rather than through the endpoint because the endpoint needs a
 * database, a service-role key and a real session to say anything at all —
 * which is why these two rules went untested when they lived inside it. They
 * are pure, so they can be checked in milliseconds, and they are the part that
 * fails permanently when it fails.
 */

const ONE = ['boss@in.test'];
const TWO = ['boss@in.test', 'second@in.test'];

describe('whyNotRemove', () => {
  it('refuses to remove the caller', () => {
    expect(whyNotRemove({ target: 'boss@in.test', by: 'boss@in.test', admins: TWO })).toMatch(/yourself/i);
  });

  it('compares addresses case-insensitively, as is_staff() does', () => {
    expect(whyNotRemove({ target: 'BOSS@IN.TEST', by: 'boss@in.test', admins: TWO })).toMatch(/yourself/i);
  });

  it('refuses to remove the only administrator', () => {
    expect(whyNotRemove({ target: 'boss@in.test', by: 'other@in.test', admins: ONE })).toMatch(/only administrator/i);
  });

  it('still refuses that when the caller could not be identified', () => {
    // `by` is null when the address could not be read off the token. The
    // self-check goes quiet; this one must not.
    expect(whyNotRemove({ target: 'boss@in.test', by: null, admins: ONE })).toMatch(/only administrator/i);
  });

  it('allows removing a reviewer who is not an administrator', () => {
    expect(whyNotRemove({ target: 'reader@in.test', by: 'boss@in.test', admins: ONE })).toBeNull();
  });

  it('allows removing an administrator once there is a second one', () => {
    expect(whyNotRemove({ target: 'second@in.test', by: 'boss@in.test', admins: TWO })).toBeNull();
  });
});

describe('whyNotDemote', () => {
  it('refuses to take away the caller’s own rights', () => {
    expect(whyNotDemote({ target: 'boss@in.test', by: 'boss@in.test', admins: TWO })).toMatch(/your own/i);
  });

  it('refuses to demote the only administrator', () => {
    expect(whyNotDemote({ target: 'boss@in.test', by: 'other@in.test', admins: ONE })).toMatch(/only administrator/i);
  });

  it('allows demoting one of two', () => {
    expect(whyNotDemote({ target: 'second@in.test', by: 'boss@in.test', admins: TWO })).toBeNull();
  });

  it('does not cry "only administrator" about somebody who is not one', () => {
    // A no-op, and answering it with a warning about a danger that is not there
    // says nothing true about what happened.
    expect(whyNotDemote({ target: 'reader@in.test', by: 'boss@in.test', admins: ONE })).toBeNull();
  });
});
