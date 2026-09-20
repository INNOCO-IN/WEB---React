import { describe, expect, it } from 'vitest';
import {
  gateFor,
  isCompleteCode,
  mayEnrolVoluntarily,
  normaliseCode,
  type Assurance,
  type SecondFactorPolicy,
} from '../lib/second-factor';

/**
 * The client's gate against the SQL it mirrors.
 *
 * `second_factor_ok()` in `20260919180000_second_factor_on_the_desk.sql` is what
 * actually refuses a read; `gateFor` only decides which screen explains it. So
 * the thing worth testing is not that the gate blocks anybody — it does not, and
 * cannot — but that the two agree, because a disagreement is silent: the
 * database refuses correctly and the desk gives the reviewer the wrong reason.
 *
 * `sqlSaysOk` below is the SQL's `case` transcribed. Every row of the table is
 * asserted against both, so a change to one that is not made to the other fails
 * here rather than in somebody's afternoon.
 */

/** `second_factor_ok()`, transcribed branch for branch. */
function sqlSaysOk(policy: SecondFactorPolicy, assurance: Assurance, verifiedFactors: number): boolean {
  if (policy === 'off') return true;
  if (policy === 'required') return assurance === 'aal2';
  return assurance === 'aal2' || verifiedFactors === 0;
}

const POLICIES: SecondFactorPolicy[] = ['off', 'enrolled', 'required'];
const LEVELS: Assurance[] = ['aal1', 'aal2'];
const FACTORS = [0, 1, 2];

describe('the gate and the database agree', () => {
  for (const policy of POLICIES) {
    for (const assurance of LEVELS) {
      for (const verifiedFactors of FACTORS) {
        it(`${policy} · ${assurance} · ${verifiedFactors} factor(s)`, () => {
          const gate = gateFor({ policy, assurance, verifiedFactors });
          // `ready` must mean exactly what the database means by "allowed", in
          // both directions. Letting somebody through that SQL will refuse is
          // the empty-desk bug the whole split was made to stop; stopping
          // somebody SQL would allow is a lockout nobody can explain.
          expect(gate === 'ready').toBe(sqlSaysOk(policy, assurance, verifiedFactors));
        });
      }
    }
  }
});

describe('which screen', () => {
  it('sends a reviewer with no factor to enrol only when the policy requires one', () => {
    expect(gateFor({ policy: 'required', assurance: 'aal1', verifiedFactors: 0 })).toBe('enrol');
    expect(gateFor({ policy: 'enrolled', assurance: 'aal1', verifiedFactors: 0 })).toBe('ready');
    expect(gateFor({ policy: 'off', assurance: 'aal1', verifiedFactors: 0 })).toBe('ready');
  });

  it('challenges anyone who holds a factor, whatever the policy says', () => {
    // The one that is easy to get wrong when relaxing the policy later: someone
    // who opted in under `required` keeps their factor when the switch goes
    // back to `enrolled`. Dropping it silently would take a second factor away
    // from a reviewer who believes they still have one.
    expect(gateFor({ policy: 'required', assurance: 'aal1', verifiedFactors: 1 })).toBe('challenge');
    expect(gateFor({ policy: 'enrolled', assurance: 'aal1', verifiedFactors: 1 })).toBe('challenge');
  });

  it('lets `off` through even for someone holding a verified factor', () => {
    // `off` is the escape hatch, and it has to be a real one: if a factor still
    // challenged under `off`, flipping the switch would not rescue anybody,
    // which is the only reason the setting exists.
    expect(gateFor({ policy: 'off', assurance: 'aal1', verifiedFactors: 2 })).toBe('ready');
  });

  it('never asks twice in one session', () => {
    for (const policy of POLICIES) {
      for (const verifiedFactors of FACTORS) {
        expect(gateFor({ policy, assurance: 'aal2', verifiedFactors })).toBe('ready');
      }
    }
  });
});

describe('offering enrolment to someone already at the desk', () => {
  it('is offered under `enrolled`, which compels nobody', () => {
    expect(mayEnrolVoluntarily({ policy: 'enrolled', assurance: 'aal1', verifiedFactors: 0 })).toBe(true);
  });

  it('is not offered when there is nothing to offer', () => {
    expect(mayEnrolVoluntarily({ policy: 'off', assurance: 'aal1', verifiedFactors: 0 })).toBe(false);
    expect(mayEnrolVoluntarily({ policy: 'required', assurance: 'aal2', verifiedFactors: 1 })).toBe(false);
    expect(mayEnrolVoluntarily({ policy: 'enrolled', assurance: 'aal2', verifiedFactors: 1 })).toBe(false);
  });
});

describe('the six digits', () => {
  it('takes a code the way an authenticator shows it', () => {
    expect(normaliseCode('482 915')).toBe('482915');
    expect(normaliseCode('482-915')).toBe('482915');
    expect(normaliseCode(' 482915\n')).toBe('482915');
  });

  it('stops at six, so a stray keypress does not silently shift the code', () => {
    expect(normaliseCode('4829157')).toBe('482915');
  });

  it('knows when there is something worth sending', () => {
    expect(isCompleteCode('482 915')).toBe(true);
    expect(isCompleteCode('48291')).toBe(false);
    expect(isCompleteCode('')).toBe(false);
    expect(isCompleteCode('abcdef')).toBe(false);
  });
});
