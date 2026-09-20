import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { CAPTCHA_SITE_KEY, loadCaptcha } from '../lib/captcha';

/**
 * The CAPTCHA widget, and a handle to reset it.
 *
 * The handle is the whole reason this is a component rather than four lines in
 * `SignIn`. **A Turnstile token is single use and short lived**, so the moment
 * a sign-in attempt fails — for any reason, including a wrong address or a rate
 * limit — the token in hand is spent. Leave it there and the reviewer's second
 * attempt fails with "captcha protection: request disallowed", which is a
 * sentence about a puzzle they already solved and tells them nothing about what
 * to change. Every failure path has to reset the widget, so the caller needs a
 * way to say so.
 *
 * Tokens also expire on their own after a few minutes. `expired-callback`
 * clears ours rather than letting the form sit holding one the server will
 * refuse — somebody who solves the puzzle, goes to find their password manager
 * and comes back would otherwise be told they failed a CAPTCHA.
 */

export interface CaptchaHandle {
  /** Clears the solved state and re-arms the widget. Safe before load. */
  reset: () => void;
}

export default function Turnstile({
  onToken,
  handle,
}: {
  /** Called with a token when solved, and with null when it lapses. */
  onToken: (token: string | null) => void;
  handle?: Ref<CaptchaHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // `onToken` in a ref, not in the dependency list. SignIn passes a fresh
  // closure every render, and a dependency on it would tear the widget down and
  // build a new one mid-puzzle — losing the reviewer's progress each time they
  // typed a character into the email field above it.
  const emit = useRef(onToken);
  emit.current = onToken;

  useImperativeHandle(handle, () => ({
    reset: () => {
      emit.current(null);
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    },
  }));

  useEffect(() => {
    let dead = false;

    void loadCaptcha()
      .then((turnstile) => {
        if (dead || !box.current || widget.current) return;
        widget.current = turnstile.render(box.current, {
          sitekey: CAPTCHA_SITE_KEY,
          theme: 'light',
          callback: (token) => emit.current(token),
          'expired-callback': () => emit.current(null),
          'error-callback': () => emit.current(null),
        });
      })
      .catch((error: Error) => {
        if (!dead) setFailed(error.message);
      });

    return () => {
      dead = true;
      // Removed rather than left for the next mount. Turnstile keeps its own
      // registry keyed by element, and a stale widget against a detached node
      // is what makes the second visit to a screen render an empty box.
      if (widget.current && window.turnstile) {
        window.turnstile.remove(widget.current);
        widget.current = null;
      }
    };
  }, []);

  // Said plainly, because the reviewer cannot fix it and needs to know that.
  // A blocked script leaves the submit button disabled with nothing to solve,
  // and an unexplained dead button reads as the desk being broken.
  if (failed) {
    return (
      <p className="rv-secondary rv-muted">
        {failed} Sign-in needs it, so something between this browser and Cloudflare is blocking it — an extension,
        or the network.
      </p>
    );
  }

  return <div ref={box} className="rv-captcha" />;
}
