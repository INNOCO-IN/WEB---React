import { useCallback, useMemo, useState } from 'react';

/**
 * Story — the four cards whose note appears on hover.
 *
 * One card is open at a time, so the state is which one rather than four
 * booleans: two cards open at once is a state the design does not have, and
 * four booleans is a way of spelling it that lets it happen.
 *
 * `hide` closes only if the card asking is the one that is open. The pointer
 * leaves the card it is on after it has entered the next one, so a plain close
 * would shut the card that had just been opened.
 *
 * The page binds each card to both the pointer and the keyboard — `onMouseEnter`
 * with `onFocus`, `onMouseLeave` with `onBlur` — so the note is reachable
 * without a mouse. StoryKO re-exports this: which card is open is not a thing
 * that differs by language.
 */

export interface StoryCards {
  open1: boolean;
  open2: boolean;
  open3: boolean;
  open4: boolean;
  show1: () => void;
  show2: () => void;
  show3: () => void;
  show4: () => void;
  hide1: () => void;
  hide2: () => void;
  hide3: () => void;
  hide4: () => void;
}

export default function useLogic(): StoryCards {
  const [open, setOpen] = useState(0);

  const show = useCallback((n: number) => () => setOpen(n), []);
  const hide = useCallback((n: number) => () => setOpen((was) => (was === n ? 0 : was)), []);

  return useMemo(
    () => ({
      open1: open === 1,
      open2: open === 2,
      open3: open === 3,
      open4: open === 4,
      show1: show(1),
      show2: show(2),
      show3: show(3),
      show4: show(4),
      hide1: hide(1),
      hide2: hide(2),
      hide3: hide(3),
      hide4: hide(4),
    }),
    [open, show, hide],
  );
}
