import { describe, expect, it } from 'vitest';
import { answerFor } from '../lib/sign-in';

/**
 * The sign-in form must not become a staff-list reader.
 *
 * Every refusal that means "no such account" has to end on the same neutral
 * screen as a success, or somebody can type addresses until one answers
 * differently. This used to be true for free — the server returned 200 either
 * way — and stopped being true when `enable_signup = false` landed, because
 * GoTrue now refuses an unknown address outright. So the rule needs a test.
 *
 * **The strings below are what the local stack actually returned**, not
 * invented ones: `otp_disabled` / "Signups not allowed for otp" was observed
 * from `POST /auth/v1/otp` for an address with no auth user, and
 * `signup_disabled` / "Signups not allowed for this instance" from a script
 * trying `create_user: true`.
 */

describe('an unknown address reads exactly like a known one', () => {
  const refusals = [
    { code: 'otp_disabled', message: 'Signups not allowed for otp' },
    { code: 'signup_disabled', message: 'Signups not allowed for this instance' },
    { code: 'user_not_found', message: 'User not found' },
    { code: 'email_not_confirmed', message: 'Email not confirmed' },
    { code: undefined, message: 'Signups not allowed for otp' },
    { code: undefined, message: 'User not found' },
    { code: undefined, message: 'not authorized' },
  ];

  for (const refusal of refusals) {
    it(`stays silent on ${refusal.code ?? 'no code'} — "${refusal.message}"`, () => {
      expect(answerFor(refusal)).toBe('sent');
    });
  }

  it('reads the same as a success', () => {
    expect(answerFor(null)).toBe('sent');
  });
});

describe('a CAPTCHA refusal is the one thing repeated out loud', () => {
  // It says nothing about the address, and hiding it would leave a reviewer
  // waiting on a link that was never sent.
  it('is reported by code', () => {
    expect(answerFor({ code: 'captcha_failed', message: 'whatever' })).toBe('report');
  });

  it('is reported by message, for both of Cloudflare’s refusals', () => {
    expect(answerFor({ message: 'captcha protection: request disallowed (no captcha_token found)' })).toBe('report');
    expect(answerFor({ message: 'captcha protection: request disallowed (invalid-input-response)' })).toBe('report');
  });
});

describe('genuine faults are the reviewer’s business', () => {
  const faults = [
    'Supabase is not configured in this build.',
    'Failed to fetch',
    'email rate limit exceeded',
    'Error sending magic link email',
    'Database error finding user',
  ];

  for (const message of faults) {
    it(`reports "${message}"`, () => {
      expect(answerFor({ message })).toBe('report');
    });
  }

  it('reports an unrecognised refusal rather than guessing', () => {
    // Deliberate: a wording nobody has seen is more likely a fault than a
    // missing account, and a reviewer who can see the words can act on them.
    expect(answerFor({ code: 'something_new', message: 'Some refusal nobody has seen yet' })).toBe('report');
  });
});
