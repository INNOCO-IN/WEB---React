import type { Lang } from '../components/nav-data';

/**
 * `2026-09-12` → `12 September 2026`, matching the legacy cards' dateline.
 *
 * Parsed and formatted in UTC. An ISO date string parsed as local time and
 * then formatted in another zone lands on the wrong day, which is how a
 * September 12 event came to be listed as September 11 in the content
 * register in the first place.
 */
export function formatDate(iso: string | null, lang: Lang = 'EN'): string {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(lang === 'KO' ? 'ko-KR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
