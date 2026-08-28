import { createContext, useCallback, useContext, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { supabase, STORY_MEDIA_BUCKET, isSupabaseConfigured } from '../lib/supabase';

/**
 * A form that writes straight to a Supabase table.
 *
 * The legacy site did this with a global script that scanned for
 * `data-in-form="table"` and read the field `name` attributes as column names.
 * That convention is worth keeping — it is genuinely nice that adding a field
 * needs no wiring — so it survives here as props instead of attributes, with
 * the same rule: a field's `name` is its column.
 *
 * Chip rows register through context rather than through hidden inputs,
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

export interface SupabaseFormProps {
  /** Table to insert into. */
  table: string;
  /** Message shown in place of the form once the insert succeeds. */
  thanks?: string;
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

      const { error } = await supabase.from(table).insert(row);
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
            color: state.status === 'error' ? 'var(--color-red)' : 'var(--color-ink-40)',
          }}
        >
          {state.status === 'sending' ? 'Sending…' : state.status === 'error' ? state.message : ''}
        </p>
      </form>
    </Ctx.Provider>
  );
}
