import type { Json } from './types';

/**
 * Narrowing readers for values that arrive as JSON.
 *
 * A saved page document is data from outside the program — a file, a database
 * row, eventually an editor. Every element reads its props through these, so
 * a malformed value produces a sane default instead of a crash, and no element
 * has to reach for `any` to get at a string.
 */

export function str(value: Json | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function num(value: Json | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function bool(value: Json | undefined, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function oneOf<T extends string>(
  value: Json | undefined,
  options: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * A CSS length from a number or a string.
 *
 * Numbers mean pixels, which is what a slider in an editor produces. Strings
 * pass through untouched, so a hand-written `clamp(40px, 5.6vw, 82px)` — which
 * is how every headline on this site is sized — survives a round trip.
 */
export function length(value: Json | undefined, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`;
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/** Only the URL shapes a page may link to. Anything else becomes no link. */
export function safeHref(value: Json | undefined): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href) return null;
  if (href.startsWith('/') || href.startsWith('#')) return href;
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href)) return href;
  // Everything else — `javascript:`, `data:`, a bare word — is refused rather
  // than rendered. Page data is content, and content must not be able to run.
  return null;
}

/** Only image sources a page may load. Same reasoning as `safeHref`. */
export function safeSrc(value: Json | undefined): string | null {
  if (typeof value !== 'string') return null;
  const src = value.trim();
  if (!src) return null;
  if (src.startsWith('/') || /^https?:\/\//i.test(src)) return src;
  return null;
}
