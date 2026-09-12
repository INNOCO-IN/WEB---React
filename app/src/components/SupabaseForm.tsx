import { createContext, useCallback, useContext, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
 */

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

export default function SupabaseForm({
  table,
  thanks = 'Thank you — we have it.',
  tone = 'ink',
  fileColumn = 'attachment_url',
  children,
  className,
  style,
  id,
}: SupabaseFormProps) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const chips = useRef<Record<string, ChipValue>>({});

  const register = useCallback((name: string, value: ChipValue) => {
    chips.current[name] = value;
  }, []);

  const context = useMemo<FormContext>(() => ({ register }), [register]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === 'sending') return;

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
          ? 'Could not reach the server. Please try again.'
          : 'This form is not connected yet. Please email hi@innoco.co.',
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
      setState({
        status: 'error',
        message: 'That did not send. Please try again, or email hi@innoco.co.',
      });
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
        {thanks}
      </p>
    );
  }

  return (
    <Ctx.Provider value={context}>
      <form id={id} className={className} style={style} onSubmit={onSubmit} noValidate={false}>
        {children}

        <p
          role="status"
          aria-live="polite"
          style={{
            font: 'var(--text-caption)',
            fontFamily: 'var(--font-sans)',
            margin: 0,
            minHeight: '1.2em',
            fontWeight: state.status === 'error' && tone === 'paper' ? 700 : undefined,
            color:
              tone === 'paper'
                ? state.status === 'error'
                  ? 'var(--color-paper)'
                  : 'var(--color-paper-dim)'
                : state.status === 'error'
                  ? 'var(--color-red)'
                  : 'var(--color-ink-40)',
          }}
        >
          {state.status === 'sending' ? 'Sending…' : state.status === 'error' ? state.message : ''}
        </p>
      </form>
    </Ctx.Provider>
  );
}
