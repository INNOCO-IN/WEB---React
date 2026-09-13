/**
 * The colour names, read from the stylesheet that defines them.
 *
 * The converter copies `site/`'s inline styles verbatim, so a page that said
 * `#2E3B40` three hundred times produced a component that says it three
 * hundred times — and the palette in `styles/tokens/colors.css`, which is the
 * design system written down, governed nothing but the handful of files that
 * were written by hand. A colour with no name is re-picked slightly
 * differently the next time somebody needs it; that is how `#E5188C` and
 * `#E6328C` both came to be "the magenta".
 *
 * So the map is built *from* the token file rather than repeated here. There is
 * still exactly one place a value lives, and naming a new colour is one line in
 * the stylesheet plus a re-run — no edit to the converter.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const COLORS = fileURLToPath(new URL('../../src/styles/tokens/colors.css', import.meta.url));

/** `--color-x: #AABBCC;` — aliases that point at `var(…)` are not values. */
const DEFINITION = /(--color-[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g;

/**
 * Every literal colour the design system names, as `#AABBCC` → `--color-x`.
 *
 * Keyed uppercase because the pages spell hex both ways. First declaration
 * wins when two names share a value: the file lists the mark's own colours
 * before the variants traced off them, so the primary name is the one a page
 * gets.
 */
export function colourTokens() {
  const css = readFileSync(COLORS, 'utf8');
  const byHex = new Map();
  const shared = [];

  for (const [, name, hex] of css.matchAll(DEFINITION)) {
    const key = hex.toUpperCase();
    if (byHex.has(key)) shared.push(`${key} is both ${byHex.get(key)} and ${name}`);
    else byHex.set(key, name);
  }
  return { byHex, shared };
}

/**
 * Rewrites the hex in one declaration *value* to the token that means it.
 *
 * Values only, never a whole stylesheet: `#facade` is six hex digits and a
 * perfectly good element id, and a selector is not a place a colour can be.
 * Anything the palette has not named is left exactly as it was and reported
 * instead — inventing a name for it here would put a value in the converter,
 * which is the thing this file exists to stop.
 */
export function tokeniseColours(value, byHex, seen = null) {
  return value.replace(/#[0-9A-Fa-f]{6}\b/g, (hex) => {
    const name = byHex.get(hex.toUpperCase());
    if (!name) {
      if (seen) seen.set(hex.toUpperCase(), (seen.get(hex.toUpperCase()) ?? 0) + 1);
      return hex;
    }
    return `var(${name})`;
  });
}

/**
 * The same, over a stylesheet: only the text after a `:` and before the `;`
 * or `}` that ends the declaration is a value.
 */
export function tokeniseColoursInCss(css, byHex, seen = null) {
  return css.replace(/:([^;{}]*)/g, (all, value) => ':' + tokeniseColours(value, byHex, seen));
}
