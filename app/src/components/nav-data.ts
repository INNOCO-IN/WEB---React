/**
 * The three nav groups — structure only.
 *
 * Each item's colour is the one its dot lights up in, traced from the logo
 * ribbon and the same colour that page uses as its key accent. The route is
 * written in the default locale and localized at render, so the nav follows
 * the reader into a language without a second copy of the table.
 *
 * The words are not here. They live in the `common` translation namespace
 * under `nav.*`, keyed by the `key` on each entry — which is what turned this
 * from one table per language into one table.
 */

/** Every nav destination, as a key into `nav.items`. */
export type NavItemKey =
  | 'mewe'
  | 'workshop'
  | 'story'
  | 'pathway'
  | 'project'
  | 'community'
  | 'people'
  | 'manifesto'
  | 'constellation'
  | 'news'
  | 'connect';

/**
 * The group wording is fixed by the design and is not a thing to improve:
 * "Start Here · Go Further · Bigger Picture". These are the keys those three
 * sentences live under.
 */
export type NavGroupKey = 'startHere' | 'goFurther' | 'biggerPicture';

export interface NavItem {
  /** Translation key under `nav.items`, and the item's stable identity. */
  key: NavItemKey;
  to: string;
  color: string;
}

export interface NavGroup {
  /** Translation key under `nav.groups`. */
  key: NavGroupKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'startHere',
    items: [
      { key: 'mewe', to: '/mewe', color: '#1E648C' },
      // The magenta the pages actually use. The palette's `--color-magenta` is
      // #E6328C, which the 2026 handoff names as the stale one.
      { key: 'workshop', to: '/workshop', color: '#E5188C' },
      { key: 'story', to: '/story', color: '#FAB414' },
    ],
  },
  {
    key: 'goFurther',
    items: [
      { key: 'pathway', to: '/pathway', color: '#F05A28' },
      { key: 'project', to: '/project', color: '#1E5A64' },
      { key: 'community', to: '/community', color: '#D21E28' },
    ],
  },
  {
    key: 'biggerPicture',
    items: [
      { key: 'people', to: '/people', color: '#46325A' },
      { key: 'manifesto', to: '/manifesto', color: '#1E8A86' },
      { key: 'constellation', to: '/constellation', color: '#F0D23C' },
      { key: 'news', to: '/news', color: '#966432' },
    ],
  },
];

/** Footer link columns, mirroring the nav groups plus the connect CTA. */
export const FOOTER_COLUMNS: { key: NavItemKey; to: string }[][] = [
  [
    { key: 'mewe', to: '/mewe' },
    { key: 'workshop', to: '/workshop' },
    { key: 'story', to: '/story' },
  ],
  [
    { key: 'pathway', to: '/pathway' },
    { key: 'project', to: '/project' },
    { key: 'community', to: '/community' },
  ],
  [
    { key: 'people', to: '/people' },
    { key: 'manifesto', to: '/manifesto' },
    { key: 'constellation', to: '/constellation' },
    { key: 'news', to: '/news' },
  ],
  [{ key: 'connect', to: '/connect' }],
];

export const SOCIAL = [
  { href: 'mailto:hi@innoco.co', key: 'email', icon: 'Email' },
  { href: 'https://www.instagram.com/innoco.co/', key: 'instagram', icon: 'Instagram' },
  { href: 'https://www.youtube.com/@innoco7950', key: 'youtube', icon: 'YouTube' },
  { href: 'https://x.com/cyunsun', key: 'x', icon: 'X' },
] as const;
