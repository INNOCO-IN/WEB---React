import { useState } from 'react';
import { useCollectives } from '../lib/hooks/useContent';
import type { Collective } from '../lib/content/collectives';

/**
 * Collectives — the roster, with each bio expanding in place.
 *
 * The roster comes from the `collectives` table, falling back to the bundled
 * copy, and stays subscribed: adding a person in the Supabase Table Editor
 * puts them on the page without a deploy or a reload. It was an array of
 * sixteen literals inside the legacy page's script, which is why the roster
 * and the studio's actual membership had to be reconciled by hand.
 *
 * The legacy page also interpolated `{{ person.photo }}` into a `src`
 * attribute, which the browser's preload scanner requested verbatim before the
 * runtime could substitute it — one 404 per page load, noted in the README as a
 * known quirk. Binding the value in JSX means the request is never made at all.
 */

export interface RosterEntry extends Collective {
  expanded: boolean;
  toggleLabel: string;
  toggle: () => void;
}

export interface CollectivesLogic {
  roster: RosterEntry[];
  openToNew: boolean;
  closedToNew: boolean;
  /** Bound by the page's own <sc-for>; declared so the generated JSX typechecks. */
  person?: RosterEntry;
}

export default function useLogic(openToNewFacilitators = true): CollectivesLogic {
  const { data: people } = useCollectives();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const roster: RosterEntry[] = people.map((person) => {
    const isOpen = Boolean(expanded[person.num]);
    return {
      ...person,
      expanded: isOpen,
      toggleLabel: isOpen ? 'Less −' : 'More +',
      toggle: () => setExpanded((state) => ({ ...state, [person.num]: !state[person.num] })),
    };
  });

  return {
    roster,
    openToNew: openToNewFacilitators,
    closedToNew: !openToNewFacilitators,
  };
}
