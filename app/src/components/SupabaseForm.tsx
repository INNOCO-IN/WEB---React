import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase, STORY_MEDIA_BUCKET, isSupabaseConfigured } from '../lib/supabase';

/**
 * A form that writes straight to a Supabase table.
 *
 * The legacy site did this with a global script that scanned for
 * `data-in-form="table"` and read the field `name` attributes as column names.
 * That convention is worth keeping — it is genuinely nice that adding a field
 * needs no wiring — so it survives here as props instead of attributes, with
 * the same rule: a field's `name` is its column. The one exception is the
 * `chip:` prefix, which means "a real control, but not a column" — see the
 * loop in `onSubmit`.
 *
 * Chip rows register through context rather than through their inputs,
 * because one of them (`format`) is a text[] and there is no HTML control that
 * means "array".
 *
 * Three of the legacy attributes are still read off the DOM rather than
 * arriving as props, because the markup they sit on belongs to the page and
 * not to this component: `data-in-status` (where the status line goes),
 * `data-hide-when` (a block that a particular answer makes irrelevant) and
 * `data-prefill` (a card elsewhere on the page that answers a question for the
 * visitor). See the effect below.
 */

/** The address a visitor falls back to when the form itself cannot send. */
const CONTACT_EMAIL = 'hi@innoco.co';

type ChipValue = string | string[] | null;

interface FormContext {
  register: (name: string, value: ChipValue) => void;
  accent?: string;
}

const Ctx = createContext<FormContext | null>(null);

export function useFormRegistration() {
  return useContext(Ctx);
}

/**
 * The tables a visitor may write to.
 *
 * Not `ContentTable`: RLS grants anon an insert on these three and nothing
 * else, so a form pointed at `news` would compile and then fail at the policy.
 * The union says out loud what the database already enforces.
 */
export type WritableTable = 'submissions' | 'stories' | 'workshop_registrations';

export interface SupabaseFormProps {
  /** Table to insert into. */
  table: WritableTable;
  /** Message shown in place of the form once the insert succeeds. */
  thanks?: string;
  /**
   * What the status line says before anything has happened — the page's own
   * reassurance, usually a promise to write back.
   *
   * A prop rather than text inside the status slot, because the slot's
   * contents are replaced the moment the visitor presses send. Written in the
   * markup it would be a sentence that exists twice and agrees only until
   * somebody edits one of them.
   */
  idle?: string;
  /**
   * Whether the form sits on paper or on one of the accent bands.
   *
   * Only the status line reads it, and only because that line is the one part
   * of a form this component colours itself — a page's own fields bring their
   * own styles, but nothing outside here knows when "Sending…" is on screen.
   * `ink` on a magenta band is unreadable, so a caller on colour says so.
   */
  tone?: 'ink' | 'paper';
  /** Column that receives an uploaded file's public URL. */
  fileColumn?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

type State =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent' }
  | { status: 'error'; message: string };

/**
 * The form element once it is on the page, together with the slot the page set
 * aside for the status line.
 *
 * Both are read in one go from the ref callback: by the time React hands the
 * form over, the children it was given are committed too, so the slot is
 * findable — and finding it once is cheaper than querying on every render.
 */
interface Host {
  form: HTMLFormElement;
  status: HTMLElement | null;
}

/** The value of a named control, or null if the form has no such control. */
function valueOf(form: HTMLFormElement, name: string): string | null {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
    ? field.value
    : null;
}

/** `field=value` — the spelling both `data-hide-when` and `data-prefill` use. */
function rule(spec: string | undefined): [string, string] | null {
  const [name, ...rest] = (spec ?? '').split('=');
  return name && rest.length ? [name, rest.join('=')] : null;
}

/**
 * Shows or hides the blocks whose question a particular answer has retired.
 *
 * "Just keep me posted about events" does not want to be asked what it hopes
 * to explore, and the page says so on the block itself rather than here, so
 * that the rule is visible to whoever is editing the page.
 */
function syncHidden(form: HTMLFormElement) {
  for (const block of form.querySelectorAll<HTMLElement>('[data-hide-when]')) {
    const parsed = rule(block.dataset.hideWhen);
    if (!parsed) continue;
    const hide = valueOf(form, parsed[0]) === parsed[1];

    // A message typed before the answer changed is still in the FormData —
    // hidden is not absent. Clearing it is the only reading of "that question
    // no longer applies" that does not send something the visitor believes
    // they took back.
    if (hide && !block.hidden) {
      const controls = block.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input, select, textarea');
      for (const control of controls) control.value = '';
    }
    block.hidden = hide;
  }
}

export default function SupabaseForm({
  table,
  thanks,
  idle,
  tone = 'ink',
  fileColumn = 'attachment_url',
  children,
  className,
  style,
  id,
}: SupabaseFormProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: 'idle' });
  const [host, setHost] = useState<Host | null>(null);
  const chips = useRef<Record<string, ChipValue>>({});
  const sending = state.status === 'sending';

  const attach = useCallback((form: HTMLFormElement | null) => {
    setHost(form ? { form, status: form.querySelector<HTMLElement>('[data-in-status]') } : null);
  }, []);

  const register = useCallback((name: string, value: ChipValue) => {
    chips.current[name] = value;
  }, []);

  const context = useMemo<FormContext>(() => ({ register }), [register]);

  // The two behaviours the page describes in its own markup. Both are wired
  // to the DOM rather than to React state because the elements involved are
  // the page's: the block to hide is somewhere in `children`, and the card
  // that prefills an answer is not inside the form at all.
  useEffect(() => {
    if (!host) return;
    const { form } = host;

    const sync = () => syncHidden(form);
    sync();
    form.addEventListener('change', sync);

    // A card elsewhere on the page can answer the form's first question for
    // the visitor: `data-prefill="field=value"` on an anchor pointing at this
    // form. The jump is left to the browser — the href is a real fragment and
    // the form carries the scroll-margin that clears the sticky nav — so all
    // that is left here is the answer itself.
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLElement>('[data-scroll-form]');
      if (!anchor || !form.id || anchor.getAttribute('href') !== `#${form.id}`) return;

      const parsed = rule(anchor.dataset.prefill);
      if (!parsed) return;
      const field = form.elements.namedItem(parsed[0]);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      ) {
        field.value = parsed[1];
        // Setting `value` from script fires nothing, and the answer may be
        // one that retires a question.
        sync();
      }
    };
    document.addEventListener('click', onClick);

    return () => {
      form.removeEventListener('change', sync);
      document.removeEventListener('click', onClick);
    };
  }, [host]);

  // The send button is the page's, styled inline by the page, so it cannot be
  // greyed out by a class. Disabling it is what stops a second press; the
  // fading is so that the first press looks like it landed.
  useEffect(() => {
    const button = host?.form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button) return;
    button.disabled = sending;
    button.style.opacity = sending ? '0.55' : '';
    return () => {
      button.disabled = false;
      button.style.opacity = '';
    };
  }, [host, sending]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    // Honeypot. A real visitor never sees this field, so anything in it is a bot.
    if (String(data.get('_hp') ?? '').trim()) {
      setState({ status: 'sent' });
      return;
    }

    if (!supabase) {
      setState({
        status: 'error',
        message: isSupabaseConfigured
          ? t('form.unreachable')
          : t('form.notConnected', { email: CONTACT_EMAIL }),
      });
      return;
    }

    setState({ status: 'sending' });

    try {
      const row: Record<string, unknown> = { ...chips.current };
      let file: File | null = null;

      for (const [key, value] of data.entries()) {
        if (key === '_hp') continue;
        // A chip row's radios and checkboxes are named `chip:<column>` so that
        // the browser groups them for the keyboard without their name being
        // read as a column here. Their value arrives through `register`, which
        // is the only path that can carry a text[]. See ChipGroup.
        if (key.startsWith('chip:')) continue;
        if (value instanceof File) {
          if (value.size > 0) file = value;
          continue;
        }
        const text = value.trim();
        if (text) row[key] = text;
      }

      // An unchecked checkbox is absent from FormData; the column is NOT NULL.
      const consent = form.querySelector<HTMLInputElement>('input[type="checkbox"][name="consent"]');
      if (consent) row.consent = consent.checked;

      if (file) {
        const extension = file.name.split('.').pop() ?? 'bin';
        const path = `${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from(STORY_MEDIA_BUCKET).upload(path, file);
        if (upload.error) throw upload.error;
        row[fileColumn] = supabase.storage.from(STORY_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      } else {
        delete row[fileColumn];
      }

      row.source_page = window.location.pathname;

      // The row is assembled at runtime from the `name` attributes of whatever
      // fields the page rendered, so its shape is not knowable here — this is
      // the one place in the app where a cast is the honest answer rather than
      // a shortcut. The table union above is what keeps it from being a blank
      // cheque, and a wrong column name still fails at the insert.
      const { error } = await supabase.from(table).insert(row as never);
      if (error) throw error;

      setState({ status: 'sent' });
      form.reset();
      chips.current = {};
    } catch (error) {
      console.error('[IN → Supabase]', error);
      setState({ status: 'error', message: t('form.sendFailed', { email: CONTACT_EMAIL }) });
    }
  }

  if (state.status === 'sent') {
    return (
      <p
        className={className}
        style={{
          font: 'var(--text-body-lg)',
          fontFamily: 'var(--font-serif)',
          margin: 0,
          maxWidth: '52ch',
          ...style,
        }}
        role="status"
      >
        {thanks ?? t('form.sent')}
      </p>
    );
  }

  // One live region, announced politely, holding the page's reassurance until
  // there is something newer to say. Its role never changes: a region that
  // appears at the same moment its text does is a region a screen reader has
  // no reason to read out.
  const message = sending
    ? t('form.submitting')
    : state.status === 'error'
      ? state.message
      : (idle ?? '');

  const statusText = (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={
        state.status === 'error'
          ? { color: tone === 'paper' ? 'var(--color-paper)' : 'var(--color-red)', fontWeight: 700 }
          : undefined
      }
    >
      {message}
    </span>
  );

  return (
    <Ctx.Provider value={context}>
      <form
        id={id}
        ref={attach}
        className={className}
        style={style}
        onSubmit={onSubmit}
        aria-busy={sending}
        noValidate={false}
      >
        {children}

        {/* Where the line goes is not known until the page's own markup is on
            the screen, so the first frame carries none. A page that set a slot
            aside gets the line in it — beside the button, where the design put
            it; one that did not gets it under the fields. */}
        {host === null ? null : host.status ? (
          createPortal(statusText, host.status)
        ) : (
          <p
            style={{
              font: 'var(--text-caption)',
              fontFamily: 'var(--font-sans)',
              margin: 0,
              minHeight: '1.2em',
              color: tone === 'paper' ? 'var(--color-paper-dim)' : 'var(--color-ink-40)',
            }}
          >
            {statusText}
          </p>
        )}
      </form>
    </Ctx.Provider>
  );
}
