import { useState } from 'react';
import { useCollectives } from '../lib/hooks/useContent';
import { inLang } from '../lib/content/types';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../lib/lang';
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
 *
 * Collectives.KO re-exports this hook, so the roster it draws is this roster:
 * one person, one row, told in whichever language the route is in and falling
 * back to English per field where the translation has not been written.
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
  const locale = useLocale();
  const { t } = useTranslation();

  const roster: RosterEntry[] = people.map((person) => {
    const isOpen = Boolean(expanded[person.num]);
    return {
      ...person,
      name: inLang(person.name, { ko: person.nameKo, 'zh-TW': person.nameZhTw }, locale) ?? person.name,
      oneLiner: inLang(person.oneLiner, { ko: person.oneLinerKo, 'zh-TW': person.oneLinerZhTw }, locale) ?? '',
      fullBio: inLang(person.fullBio, { ko: person.fullBioKo, 'zh-TW': person.fullBioZhTw }, locale) ?? '',
      role: inLang(person.role, { ko: person.roleKo, 'zh-TW': person.roleZhTw }, locale),
      expanded: isOpen,
      toggleLabel: isOpen ? t('cards.less') : t('cards.more'),
      toggle: () => setExpanded((state) => ({ ...state, [person.num]: !state[person.num] })),
    };
  });

  return {
    roster,
    openToNew: openToNewFacilitators,
    closedToNew: !openToNewFacilitators,
  };
}
