import type { CSSProperties } from 'react';

/**
 * CSS declaration string → React style object.
 *
 * Static styles are converted once at build time by the page converter. This
 * is for the handful of places where a page's own logic builds a style string
 * at render time — the nav dots, the constellation modes — where the string
 * genuinely is not known until then.
 */

const cache = new Map<string, CSSProperties>();

function toJsProp(prop: string): string {
  if (prop.startsWith('--')) return prop;
  const camel = prop.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
  return prop.startsWith('-') ? camel[0].toUpperCase() + camel.slice(1) : camel;
}

/** Splits on semicolons that are not inside `url(…)`, quotes or `var(…)`. */
function split(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;

  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === quote && css[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) {
      out.push(css.slice(start, i));
      start = i + 1;
    }
  }
  out.push(css.slice(start));
  return out;
}

export function sx(css: string | CSSProperties | null | undefined): CSSProperties {
  if (!css) return {};
  if (typeof css !== 'string') return css;

  const hit = cache.get(css);
  if (hit) return hit;

  const style: Record<string, string> = {};
  for (const decl of split(css)) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim();
    const value = decl.slice(colon + 1).trim().replace(/\s*!important\s*$/i, '');
    if (prop && value) style[toJsProp(prop)] = value;
  }

  const frozen = style as CSSProperties;
  cache.set(css, frozen);
  return frozen;
}
