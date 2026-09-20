/**
 * The CAPTCHA on the review desk's sign-in form, and the one thing to know
 * about it: **it is a switch in two places that must agree.**
 *
 * Supabase verifies the token server-side, which is what makes it worth having
 * — but that also means the project and this build have to be in step. If the
 * project has CAPTCHA on and the page sends no token, every sign-in is refused
 * with "captcha protection: request disallowed"; if the project has it off, a
 * token is simply ignored. Neither failure mentions a CAPTCHA to the person
 * typing their address, so the two are documented together in SUPABASE.md and
 * changed together.
 *
 * Why it is here at all: `shouldCreateUser: false` already means an address
 * nobody invited gets no mail, and the form answers the same way either way, so
 * the list cannot be read one guess at a time. What was left was volume — the
 * rate limits allow 30 sign-in requests per IP per five minutes, which is
 * plenty for a script to keep mailing a real reviewer a real sign-in link all
 * day and then phish one of them. This is aimed at that, and at nothing else. A
 * determined person targeting one known mailbox is the second factor's problem.
 *
 * Turnstile rather than hCaptcha: free, no image puzzles for the reviewer in
 * the common case, and it does not profile them. Both are supported by
 * Supabase; `provider` in `config.toml` has to match whichever key you use.
 */

/**
 * The site key — public by design.
 *
 * `VITE_` prefixed, so it is in the browser bundle, and that is correct: the
 * site key identifies the widget and is meant to be read by anyone who views
 * source. Its pair, the *secret* key, goes to Supabase and never to Vite —
 * see `config.toml` and `SUPABASE.md`.
 */
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * Absent key means no widget and no token.
 *
 * Deliberately a soft default, matching `isSupabaseConfigured`: a checkout with
 * no `.env.local` still renders a working sign-in form rather than a dead one.
 * The cost is that this cannot detect the mismatch it warns about above — only
 * the project knows whether it is expecting a token — so a build with no key
 * against a project with CAPTCHA on fails at sign-in. That is why SignIn
 * surfaces the server's own words instead of a friendlier sentence.
 */
export const isCaptchaConfigured = Boolean(siteKey);

export const CAPTCHA_SITE_KEY = siteKey ?? '';

interface Turnstile {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** One load per document, however many times a door screen mounts. */
let loading: Promise<Turnstile> | null = null;

/**
 * Loads Cloudflare's script, once.
 *
 * `render=explicit` matters: without it Turnstile hunts the document for
 * things to attach itself to on load, which in a single-page app means it
 * races the router and sometimes attaches to nothing. Rendering by hand from
 * an effect is the only way the widget's lifetime matches the component's.
 *
 * Rejects rather than hanging when the script is blocked — an ad blocker, a
 * corporate proxy, no network. A reviewer behind one of those needs the form
 * to say so, not to sit disabled forever with no explanation.
 */
export function loadCaptcha(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;

  loading = new Promise<Turnstile>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const script = existing ?? document.createElement('script');

    script.addEventListener('load', () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile loaded but registered nothing.'));
    });
    script.addEventListener('error', () => {
      // Cleared so a retry can try again rather than being handed this
      // rejection forever.
      loading = null;
      reject(new Error('The CAPTCHA script could not be loaded.'));
    });

    if (!existing) {
      script.src = SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return loading;
}
