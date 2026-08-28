/**
 * The three nav groups, in both languages.
 *
 * Each item's colour is the one the dot lights up in — traced from the logo
 * ribbon, and the same colour that page uses as its key accent. Kept as data
 * so the nav is one component rather than two near-identical ones.
 */

export type Lang = 'EN' | 'KO';

export interface NavItem {
  to: string;
  label: string;
  color: string;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV: Record<Lang, NavGroup[]> = {
  EN: [
    {
      heading: 'Start Within',
      items: [
        { to: '/manifesto', label: 'Manifesto', color: '#1E8A86' },
        { to: '/collectives', label: 'Collectives', color: '#46325A' },
        { to: '/mewe', label: 'MEWE', color: '#1E648C' },
      ],
    },
    {
      heading: 'Share the Space',
      items: [
        { to: '/workshop', label: 'Workshop', color: '#E6328C' },
        { to: '/story', label: 'Story', color: '#FAB414' },
        { to: '/protagonist', label: 'Protagonist', color: '#F05A28' },
      ],
    },
    {
      heading: 'Serve the Whole',
      items: [
        { to: '/project', label: 'Project', color: '#1E5A64' },
        { to: '/community', label: 'Community', color: '#D21E28' },
        { to: '/constellation', label: 'Constellation', color: '#F0D23C' },
        { to: '/news', label: 'News', color: '#966432' },
      ],
    },
  ],
  KO: [
    {
      heading: '안에서 시작하기',
      items: [
        { to: '/ko/manifesto', label: '매니페스토', color: '#1E8A86' },
        { to: '/ko/collectives', label: '콜렉티브', color: '#46325A' },
        { to: '/ko/mewe', label: 'MEWE', color: '#1E648C' },
      ],
    },
    {
      heading: '공간을 나누기',
      items: [
        { to: '/ko/workshop', label: '워크숍', color: '#E6328C' },
        { to: '/ko/story', label: '스토리', color: '#FAB414' },
        { to: '/ko/protagonist', label: '주역', color: '#F05A28' },
      ],
    },
    {
      heading: '더 큰 우리에게',
      items: [
        { to: '/ko/project', label: '프로젝트', color: '#1E5A64' },
        { to: '/ko/community', label: '커뮤니티', color: '#D21E28' },
        { to: '/ko/constellation', label: '별자리', color: '#F0D23C' },
        { to: '/ko/news', label: '소식', color: '#966432' },
      ],
    },
  ],
};

/** Footer link columns, mirroring the nav groups plus the connect CTA. */
export const FOOTER_LINKS: Record<Lang, { to: string; label: string }[][]> = {
  EN: [
    [
      { to: '/manifesto', label: 'Manifesto' },
      { to: '/collectives', label: 'Collectives' },
      { to: '/mewe', label: 'MEWE' },
    ],
    [
      { to: '/workshop', label: 'Workshop' },
      { to: '/story', label: 'Story' },
      { to: '/protagonist', label: 'Protagonist' },
    ],
    [
      { to: '/project', label: 'Project' },
      { to: '/community', label: 'Community' },
      { to: '/constellation', label: 'Constellation' },
      { to: '/news', label: 'News' },
    ],
    [{ to: '/connect', label: 'Are you IN?' }],
  ],
  KO: [
    [
      { to: '/ko/manifesto', label: '매니페스토' },
      { to: '/ko/collectives', label: '콜렉티브' },
      { to: '/ko/mewe', label: 'MEWE' },
    ],
    [
      { to: '/ko/workshop', label: '워크숍' },
      { to: '/ko/story', label: '스토리' },
      { to: '/ko/protagonist', label: '주역' },
    ],
    [
      { to: '/ko/project', label: '프로젝트' },
      { to: '/ko/community', label: '커뮤니티' },
      { to: '/ko/constellation', label: '별자리' },
      { to: '/ko/news', label: '소식' },
    ],
    [{ to: '/ko/connect', label: 'Are you IN?' }],
  ],
};

export const SOCIAL = [
  { href: 'mailto:hi@innoco.co', label: 'Email' },
  { href: 'https://www.instagram.com/innoco.co/', label: 'Instagram' },
  { href: 'https://www.youtube.com/@innoco7950', label: 'YouTube' },
  { href: 'https://x.com/cyunsun', label: 'X' },
] as const;
