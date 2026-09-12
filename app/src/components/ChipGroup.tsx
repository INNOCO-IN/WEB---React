import { Children, cloneElement, isValidElement, useEffect, useId, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { useFormRegistration } from './SupabaseForm';
import './ChipGroup.css';

/**
 * A row of selectable chips standing in for a form field.
 *
 * `multi` decides both the interaction and the column type: single-select
 * writes a text, multi-select writes a text[]. The selected colours are per
 * group because each page tints its chips with its own key colour — Story
 * Submission uses the amber from its hero.
 *
 * **The chips are real radios and checkboxes.** They were `<span>`s on the
 * legacy site, then `aria-pressed` buttons here, and a toggle button is still
 * the wrong shape for this: five chips where one may be chosen is a radio
 * group, and ten where any may be is a set of checkboxes. Saying so is what
 * buys arrow-key movement between the options, "radio button, 3 of 5" instead
 * of "button, pressed", and a group a screen reader can move through as a
 * group. The pill is a `<label>` around a visually hidden input, so the thing
 * you click and the thing that holds the state are the same thing.
 *
 * The inputs are named `chip:<column>` rather than `<column>`, because the
 * name is what groups radios for the keyboard and it is also what SupabaseForm
 * reads as a column. `format` is a `text[]`; a checkbox group under that name
 * would put the last checked string into FormData and overwrite the array.
 * The prefix keeps the grouping and stays out of the row — the value reaches
 * the insert through `register`, as it did before.
 *
 * The group needs a name of its own, and it has to come from the page: it used
 * to be `aria-label={name}`, which announced the database column — "age
 * range", "arc stage". Every group on a page already has a visible question
 * above it, so `labelledBy` points at that instead of restating it.
 */

export interface ChipGroupProps {
  /** Column this group writes to. */
  name: string;
  /** Allow more than one selection — writes an array. */
  multi?: boolean;
  /** Id of the visible question that names this group. */
  labelledBy?: string;
  /** A name for the group where the page has no visible one to point at. */
  label?: string;
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
  /** Only the two properties the page's own style also names. */
  selectedStyle?: Pick<CSSProperties, 'background' | 'color'>;
  inputName?: string;
  multi?: boolean;
}

export function Chip({
  value,
  children,
  style,
  selected,
  onSelect,
  selectedStyle,
  inputName,
  multi,
}: ChipProps) {
  return (
    <label
      className="in-chip"
      // `background` and `color` are the same two property names the page's
      // generated style uses, so overriding them here replaces a value rather
      // than mixing two spellings of it. The border colour is not: the page
      // writes the `border` shorthand, and layering `borderColor` over that is
      // what React warns about — remove the longhand on deselect and the
      // border keeps the last selection's colour. That one lives in CSS, off
      // `data-selected`. See ChipGroup.css.
      data-selected={selected || undefined}
      style={{ font: 'inherit', ...style, ...(selected ? selectedStyle : null) }}
    >
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={inputName}
        value={value}
        checked={Boolean(selected)}
        onChange={() => onSelect?.(value)}
        // A radio cannot be unchecked by clicking it, and these answers are
        // optional — so a click on the one already chosen clears it. `change`
        // does not fire in that case; `click` does.
        onClick={() => {
          if (!multi && selected) onSelect?.(value);
        }}
      />
      <span>{children}</span>
    </label>
  );
}

export default function ChipGroup({
  name,
  multi = false,
  labelledBy,
  label,
  selBg = '#2E3B40',
  selFg = '#FAF4E2',
  selBorder = '#2E3B40',
  children,
  style,
  className,
}: ChipGroupProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const form = useFormRegistration();
  const uid = useId();
  const inputName = `chip:${name}${uid}`;

  useEffect(() => {
    form?.register(name, multi ? selected : (selected[0] ?? null));
  }, [form, name, multi, selected]);

  function onSelect(value: string) {
    setSelected((current) => {
      if (!multi) return current[0] === value ? [] : [value];
      return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    });
  }

  return (
    <div
      className={['in-chips', className].filter(Boolean).join(' ')}
      style={{ ...style, '--chip-border': selBorder } as CSSProperties}
      role={multi ? 'group' : 'radiogroup'}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const element = child as ReactElement<ChipProps>;
        if (element.props.value === undefined) return child;
        return cloneElement(element, {
          selected: selected.includes(element.props.value),
          onSelect,
          selectedStyle: { background: selBg, color: selFg },
          inputName,
          multi,
        });
      })}
    </div>
  );
}
