/**
 * What the sign-in form is allowed to say out loud.
 *
 * The form must answer identically whether or not an address has an account,
 * because a form that answers differently is a way of reading the staff list
 * one guess at a time. That rule lived as a regex inside the component and had
 * no test, which was survivable while every refusal looked the same from the
 * server. It stopped being survivable when `enable_signup = false` landed:
 * GoTrue now refuses an unknown address with `otp_disabled` where it used to
 * return 200, so **the server itself distinguishes them** and the only thing
 * left collapsing the two is this function.
 *
 * (The API still distinguishes them for anyone who skips the form and scripts
 * the endpoint — that is not fixable from here, and it is the CAPTCHA's job to
 * make it expensive. What is fixable is that our own page must not hand the
 * distinction over for free.)
 */

/** What a failed send should become on screen. */
export type Answer =
  /** Show the neutral "if that address is on the staff list…" screen. */
  | 'sent'
  /** Show the server's own words: this says nothing about the address. */
  | 'report';

/**
 * Refusals that mean "no such account", in every wording seen so far.
 *
 * Matched on both the error code and the message. The **code** is the stable
 * identifier and is what should win; the message patterns stay because
 * `sendSignInLink` has returned prose since before the codes were plumbed
 * through, and a wording this list has not seen must fail closed — towards
 * silence — rather than print a sentence that distinguishes a reviewer from a
 * stranger.
 */
const NO_SUCH_ACCOUNT_CODES = ['otp_disabled', 'signup_disabled', 'user_not_found', 'email_not_confirmed'];
const NO_SUCH_ACCOUNT_TEXT = /user not found|signups? not allowed|signups? disabled|not authorized|otp_disabled/i;

/**
 * A CAPTCHA refusal is the one exception, and it is worth saying why.
 *
 * It carries no information about the address — it failed before GoTrue ever
 * looked one up — and the alternative is worse than a leak: "check your mail"
 * would leave a reviewer waiting on a link that was never sent, with the real
 * reason on a server they cannot read. It is also how a
 * site-key/project-setting mismatch surfaces; see `lib/captcha.ts`.
 */
const CAPTCHA = /captcha/i;

export function answerFor(error: { message: string; code?: string } | null): Answer {
  if (!error) return 'sent';
  if (CAPTCHA.test(error.message) || error.code === 'captcha_failed') return 'report';
  if (error.code && NO_SUCH_ACCOUNT_CODES.includes(error.code)) return 'sent';
  if (NO_SUCH_ACCOUNT_TEXT.test(error.message)) return 'sent';

  // Everything else is a genuine fault — no network, a misconfigured project,
  // a rate limit. Those are the reviewer's business and none of them say
  // whether the address exists.
  return 'report';
}
