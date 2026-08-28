import { Children, cloneElement, isValidElement, useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { useFormRegistration } from './SupabaseForm';

/**
 * A row of selectable chips standing in for a form field.
 *
 * `multi` decides both the interaction and the column type: single-select
 * writes a text, multi-select writes a text[]. The selected colours are per
 * group because each page tints its chips with its own key colour — Story
 * Submission uses the amber from its hero.
 *
 * Chips are rendered as real <button>s, not the legacy <span>s: they are
 * controls, and a span is invisible to the keyboard and to a screen reader.
 */

export interface ChipGroupProps {
  /** Column this group writes to. */
  name: string;
  /** Allow more than one selection — writes an array. */
  multi?: boolean;
  selBg?: string;
  selFg?: string;
  selBorder?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export interface ChipProps {
  value: string;
  children: ReactNode;
  style?: CSSProperties;
  /** Injected by ChipGroup. */
  selected?: boolean;
  onSelect?: (value: string) => void;
  selectedStyle?: CSSProperties;
}

export function Chip({ value, children, style, selected, onSelect, selectedStyle }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(value)}
      style={{
        font: 'inherit',
        cursor: 'pointer',
        ...style,
        ...(selected ? selectedStyle : null),
      }}
    >
      {children}
    </button>
  );
}

export default function ChipGroup({
  name,
  multi = false,
  selBg = '#2E3B40',
  selFg = '#FAF4E2',
  selBorder = '#2E3B40',
  children,
  style,
  className,
}: ChipGroupProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const form = useFormRegistration();

  useEffect(() => {
    form?.register(name, multi ? selected : (selected[0] ?? null));
  }, [form, name, multi, selected]);

  function onSelect(value: string) {
    setSelected((current) => {
      if (!multi) return current[0] === value ? [] : [value];
      return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    });
  }

  const selectedStyle: CSSProperties = {
    background: selBg,
    color: selFg,
    borderColor: selBorder,
  };

  return (
    <div className={className} style={style} role="group" aria-label={name}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const element = child as ReactElement<ChipProps>;
        if (element.props.value === undefined) return child;
        return cloneElement(element, {
          selected: selected.includes(element.props.value),
          onSelect,
          selectedStyle,
        });
      })}
    </div>
  );
}
