/**
 * Which screen the desk owes you, given how strong your session is.
 *
 * This is the client's copy of a decision the database has already made, and
 * the order of those two things is the whole point. `is_staff()` is what
 * actually refuses a read — an aal1 token speaks to PostgREST directly, so a
 * check written only here would be a picture of a lock. What this is for is
 * *explaining* the refusal: without it a reviewer who has not verified their
 * factor sees the same empty queue as a stranger, and `States.tsx` already
 * documents how badly that one reads.
 *
 * So it must agree with `second_factor_ok()` in
 * `20260919180000_second_factor_on_the_desk.sql` case for case, and the test
 * beside this file is written against the same table the SQL was. If the two
 * ever drift, the database wins and the reviewer gets a wrong explanation of a
 * correct refusal — which is the failure worth catching early, because nothing
 * else in the tool would notice it.
 */

/** The switch in `public.review_policy`. Same three words the check constraint allows. */
export type SecondFactorPolicy = 'off' | 'enrolled' | 'required';

/** GoTrue's own claim. `aal1` is a session that signed in and stopped there. */
export type Assurance = 'aal1' | 'aal2';

export interface SessionStrength {
  policy: SecondFactorPolicy;
  assurance: Assurance;
  /** Verified factors only. A half-finished enrolment is not a factor. */
  verifiedFactors: number;
}

/**
 * `ready` — go to the desk. `enrol` — no factor yet and the policy wants one.
 * `challenge` — there is a factor; it has not been used this session.
 */
export type Gate = 'ready' | 'enrol' | 'challenge';

/**
 * The same `case` the SQL runs, in the same order.
 *
 * `challenge` before the policy check is deliberate and is the one line worth
 * reading twice: somebody who enrolled under `required`, and who is then moved
 * back to `enrolled`, is still asked for their code. Dropping the requirement
 * for people who never opted in is a migration decision; quietly dropping it
 * for somebody who did would take a factor away from a reviewer who thinks
 * they still have one, without telling them.
 */
export function gateFor({ policy, assurance, verifiedFactors }: SessionStrength): Gate {
  if (policy === 'off') return 'ready';
  if (assurance === 'aal2') return 'ready';
  if (verifiedFactors > 0) return 'challenge';
  return policy === 'required' ? 'enrol' : 'ready';
}

/**
 * Whether enrolling is worth offering to somebody the gate has already let in.
 *
 * Under `enrolled` the answer is yes and matters: that setting compels nobody,
 * so the only way anybody ever gets a second factor is by being asked while
 * they are already at the desk. Under `off` there is nothing to offer, and
 * under `required` the gate has offered it already.
 */
export function mayEnrolVoluntarily({ policy, verifiedFactors }: SessionStrength): boolean {
  return policy === 'enrolled' && verifiedFactors === 0;
}

/**
 * The six digits, as the authenticator shows them.
 *
 * People read a code in two groups of three and paste it with the space still
 * in; phone keyboards add one of their own. Stripping every non-digit here
 * rather than at each call site means the field can stay `inputMode="numeric"`
 * without also having to be strict about what it accepts.
 */
export function normaliseCode(input: string): string {
  return input.replace(/\D+/g, '').slice(0, 6);
}

/** Six digits, and nothing else, is the only thing worth sending. */
export function isCompleteCode(input: string): boolean {
  return normaliseCode(input).length === 6;
}
