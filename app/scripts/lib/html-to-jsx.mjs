/**
 * HTML → JSX.
 *
 * The old pages are hand-written HTML with a few non-standard extras that the
 * `support.js` runtime understood: `{{ }}` bindings, `<sc-if>` / `<sc-for>`
 * control flow, `style-hover`, and `<dc-import>` component slots. This turns
 * all of that into ordinary React: real style objects, real conditionals and
 * `.map()`, real `<Link>`s, and CSS classes where an attribute used to carry
 * presentation.
 *
 * Deliberately a small hand-rolled tokenizer rather than a DOM library: the
 * input is a known, well-formed set of 79 files, and the interesting work is
 * all in the attribute and binding translation, not in parsing edge cases.
 */

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

/** HTML attribute → JSX prop. Anything not listed passes through unchanged. */
const ATTR = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  novalidate: 'noValidate',
  enctype: 'encType',
  accesskey: 'accessKey',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  srcset: 'srcSet',
  usemap: 'useMap',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  'http-equiv': 'httpEquiv',
  // SVG presentation attributes React expects in camelCase.
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'stroke-miterlimit': 'strokeMiterlimit',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'vector-effect': 'vectorEffect',
  'preserveaspectratio': 'preserveAspectRatio',
  'preserveAspectRatio': 'preserveAspectRatio',
  'viewbox': 'viewBox',
  'xlink:href': 'xlinkHref',
  referrerpolicy: 'referrerPolicy',
  allowfullscreen: 'allowFullScreen',
  allowtransparency: 'allowTransparency',
  frameborder: 'frameBorder',
  marginwidth: 'marginWidth',
  marginheight: 'marginHeight',
  formaction: 'formAction',
  srclang: 'srcLang',
  playsinline: 'playsInline',
  autoplay: 'autoPlay',
  defaultchecked: 'defaultChecked',
  defaultvalue: 'defaultValue',
  'gradientunits': 'gradientUnits',
  'patternunits': 'patternUnits',
  'markerwidth': 'markerWidth',
  'markerheight': 'markerHeight',
};

/** Editor-only attributes from the design tool. They mean nothing at runtime. */
const DROP_ATTR = new Set([
  'hint-size', 'hint-placeholder-val', 'hint-placeholder-count', 'style-hover',
  'data-dc-script', 'data-props',
  // Consumed by SupabaseForm / ChipGroup, which read them as props instead.
  'data-in-form', 'data-in-thanks', 'data-chip-group', 'data-multi',
  'data-sel-bg', 'data-sel-fg', 'data-sel-border', 'data-value', 'data-label-id',
  // The long form of <image-slot>; the component is resolved by import.
  'component-from-global-scope', 'from',
]);

/**
 * Props React types as `number`, so a string literal fails the build. HTML has
 * no such distinction — `tabindex="-1"` is a string in the source either way.
 */
const NUMERIC_PROPS = new Set([
  'tabIndex', 'rows', 'cols', 'colSpan', 'rowSpan', 'size', 'span', 'start',
  'maxLength', 'minLength',
]);

/**
 * Props React types as `boolean`. In HTML their presence is the value, and
 * they are usually written out longhand (`required="required"`).
 */
const BOOLEAN_PROPS = new Set([
  'checked', 'defaultChecked', 'disabled', 'readOnly', 'required', 'multiple',
  'autoFocus', 'noValidate', 'allowFullScreen', 'hidden', 'selected', 'open',
  'reversed', 'async', 'defer', 'controls', 'muted', 'autoPlay', 'playsInline',
  'itemScope', 'formNoValidate',
]);

/* ------------------------------------------------------------------ styles */

/**
 * Splits a CSS declaration list on top-level semicolons — `url(a;b)`,
 * quoted strings and `var(--x, y)` all keep their contents intact.
 */
function splitDeclarations(css) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === quote && css[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) {
      out.push(css.slice(start, i));
      start = i + 1;
    }
  }
  out.push(css.slice(start));
  return out.map((d) => d.trim()).filter(Boolean);
}

/** `background-color` → `backgroundColor`; `-webkit-x` → `WebkitX`; `--x` stays. */
export function cssPropToJs(prop) {
  if (prop.startsWith('--')) return prop;
  const camel = prop.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
  return prop.startsWith('-') ? camel[0].toUpperCase() + camel.slice(1) : camel;
}

/** A CSS declaration list → the source text of a React style object. */
/**
 * A literal font stack → the design token that already means it.
 *
 * The Korean pages differ from the English ones partly by having Noto spliced
 * into thirteen inline stacks. Naming the token instead makes that difference
 * disappear rather than handling it: `--font-serif` resolves to the stack with
 * Noto in it under `:root[lang='ko']`, so one component sets the right face in
 * every language. See styles/tokens/fonts.css.
 */
function fontToken(stack) {
  if (/^['"]?Newsreader/.test(stack.trim())) return 'var(--font-serif)';
  if (/^['"]?Archivo/.test(stack.trim())) return 'var(--font-sans)';
  return null;
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.tokeniseFonts] rewrite literal stacks to design tokens
 * @param {string[][]} [opts.capture]    collect `[prop, value]` pairs per style
 * @param {Map<string,string>} [opts.substitute] prop → replacement value
 */
export function styleStringToObject(css, opts = {}) {
  const { tokeniseFonts = false, capture = null, substitute = null } = opts;
  // A style object cannot repeat a key, and duplicated declarations do occur
  // in the source. CSS resolves them last-wins, so a Map does the same.
  const entries = new Map();
  for (const decl of splitDeclarations(css)) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim();
    let value = decl.slice(colon + 1).trim();
    if (!prop || !value) continue;

    // React drops `!important` from style objects silently; keep the
    // declaration honest by stripping it here and noting it in the output.
    value = value.replace(/\s*!important\s*$/i, '');

    const key = cssPropToJs(prop);
    if (tokeniseFonts && key === 'fontFamily') {
      const token = fontToken(value);
      if (token) value = token;
    }
    // A value that differs between the two language editions is a design
    // decision about that language, not a word — a Hangul headline needs more
    // leading than a Latin one. It becomes a custom property so the one
    // component can carry both.
    if (capture) capture.push([key, value]);
    if (substitute?.has(key)) value = substitute.get(key);
    const quotedKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    entries.set(quotedKey, `${quotedKey}: ${JSON.stringify(value)}`);
  }
  return entries.size ? `{ ${[...entries.values()].join(', ')} }` : '{}';
}

/* ---------------------------------------------------------------- bindings */

const BINDING = /^\s*\{\{([\s\S]*?)\}\}\s*$/;

/** `"{{ g1.d0 }}"` → `g1.d0`, or null when the value is a plain string. */
function asBinding(value) {
  const m = BINDING.exec(value);
  return m ? m[1].trim() : null;
}

/** Does a text run contain a `{{ }}` binding anywhere inside it? */
function hasBinding(text) {
  return /\{\{[\s\S]*?\}\}/.test(text);
}

/* ------------------------------------------------------------------ parser */

function parseAttrs(source) {
  const attrs = [];
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(source))) {
    const name = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? null;
    attrs.push({ name, value });
  }
  return attrs;
}

/**
 * HTML source → a tree of {type:'element'|'text'|'comment'} nodes.
 *
 * `notes` collects anything malformed enough to be worth a human look. The
 * browser recovers from these silently, which is exactly why they survive in
 * the source; a parser that fixes them without saying so would hide a typo
 * that is visible on the live page.
 */
export function parse(html, notes = []) {
  const root = { type: 'element', tag: '#root', attrs: [], children: [] };
  const stack = [root];
  let i = 0;

  const push = (node) => stack[stack.length - 1].children.push(node);

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      const text = html.slice(i);
      if (text.trim()) push({ type: 'text', value: text });
      break;
    }
    if (lt > i) {
      const text = html.slice(i, lt);
      if (text.trim()) push({ type: 'text', value: text });
    }

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      const stop = end === -1 ? html.length : end + 3;
      push({ type: 'comment', value: html.slice(lt + 4, end === -1 ? html.length : end) });
      i = stop;
      continue;
    }

    if (html.startsWith('<!', lt)) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    // A `<` that cannot begin a tag is a literal character — the HTML5 rule,
    // and what the live page renders. `Workshop-Bucket-List.KO` has one:
    // `…이다음에 좋은<<div …>`, a `</div>` that lost most of itself.
    if (!/[A-Za-z/]/.test(html[lt + 1] ?? '')) {
      notes.push({ kind: 'stray-lt', at: lt, near: html.slice(Math.max(0, lt - 40), lt + 20) });
      push({ type: 'text', value: '<' });
      i = lt + 1;
      continue;
    }

    if (html.startsWith('</', lt)) {
      const end = html.indexOf('>', lt);
      const tag = html.slice(lt + 2, end).trim().toLowerCase();
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === tag) {
          stack.length = s;
          break;
        }
      }
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    // Opening tag. Scan for the closing `>` outside any quoted attribute value.
    let j = lt + 1;
    let quote = null;
    while (j < html.length) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
      j++;
    }

    const raw = html.slice(lt + 1, j);
    const selfClosing = raw.endsWith('/');
    const body = selfClosing ? raw.slice(0, -1) : raw;
    const space = body.search(/\s/);
    const tag = (space === -1 ? body : body.slice(0, space)).toLowerCase();
    const attrs = space === -1 ? [] : parseAttrs(body.slice(space));

    const node = { type: 'element', tag, attrs, children: [] };
    push(node);

    // <script> and <style> hold text, not markup — take everything verbatim.
    if (tag === 'script' || tag === 'style') {
      const close = html.toLowerCase().indexOf(`</${tag}`, j);
      const end = close === -1 ? html.length : close;
      node.children.push({ type: 'text', value: html.slice(j + 1, end), raw: true });
      const gt = html.indexOf('>', end);
      i = gt === -1 ? html.length : gt + 1;
      continue;
    }

    if (!selfClosing && !VOID.has(tag)) stack.push(node);
    i = j + 1;
  }

  return root;
}

/* ------------------------------------------------------------------ output */

/**
 * Text destined for a JSX child position.
 *
 * Emitted as a string expression whenever the literal form would change the
 * rendered output. Two cases matter:
 *
 *   - Leading or trailing spaces. JSX discards whitespace runs containing a
 *     newline, so `where we <em>practice</em>` written across three lines
 *     silently renders as `where wepractice`.
 *   - `{`, `}` and `<`, which are syntax rather than text.
 */
/**
 * Whether a run of text is a sentence rather than punctuation.
 *
 * `→`, `·`, `/` and lone digits are the same in every language, so keying them
 * would put arrows in a translator's word list. Anything with a letter in it —
 * Latin, Hangul or Han — is copy.
 */
function isCopy(value) {
  return /[\p{Letter}]/u.test(value);
}

/**
 * Records one translatable string and returns the key that stands in for it.
 *
 * Keys are positional — `003_h1` — because the words come out of the two HTML
 * pages by walking them in step, and position is the only thing the English
 * and the Korean file provably share. They sort into document order, which is
 * what makes the two files readable side by side.
 */
function wordKey(ctx, tag, value) {
  const index = String(ctx.words.size).padStart(3, '0');
  const key = `${index}_${tag ?? 'text'}`;
  ctx.words.set(key, value.replace(/\s+/g, ' '));
  return key;
}

function jsxText(value) {
  const collapsed = value.replace(/\s+/g, ' ');
  if (!collapsed.trim()) return '';
  if (collapsed !== collapsed.trim() || /[{}<>]/.test(collapsed)) {
    return `{${JSON.stringify(collapsed)}}`;
  }
  return collapsed;
}

/**
 * A text run containing `{{ }}` → JSX children mixing literals and expressions.
 */
function jsxTextWithBindings(value) {
  const parts = [];
  let last = 0;
  const re = /\{\{([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(value))) {
    const before = value.slice(last, m.index);
    if (before) parts.push(jsxText(before));
    parts.push(`{${m[1].trim()}}`);
    last = m.index + m[0].length;
  }
  const rest = value.slice(last);
  if (rest) parts.push(jsxText(rest));
  return parts.filter(Boolean).join('');
}

/**
 * Options for the next inline style, numbered in document order.
 *
 * The number is what lets the English and the Korean edition of a page be
 * compared: same structure, same walk, so style *n* on one side is style *n*
 * on the other.
 */
function styleOpts(ctx) {
  if (!ctx.styles2) return { tokeniseFonts: ctx.tokeniseFonts };
  const index = ctx.styles2.length;
  const capture = [];
  ctx.styles2.push(capture);
  return {
    tokeniseFonts: ctx.tokeniseFonts,
    capture,
    substitute: ctx.substitutions?.get(index) ?? null,
  };
}

const INDENT = (n) => '  '.repeat(n);

/**
 * Renders one parsed tree as JSX source.
 *
 * `ctx` collects everything the caller needs to finish the component:
 *   imports  — components the output references (Link, ImageSlot, …)
 *   footer   — props lifted off `<dc-import name="Footer">`
 *   usesSx   — whether a dynamic `style={{ … }}` binding needed the runtime
 *              CSS-string parser
 */
export function toJsx(node, ctx, depth = 0) {
  if (node.type === 'comment') {
    const text = node.value.trim().replace(/\*\//g, '*\\/');

    // `<!-- in-component: WorkshopRegister slug="pathfinder" -->` is a slot for
    // a component this app has and the legacy page does not.
    //
    // A `dc-import` would be the obvious spelling, and it is wrong here: the
    // static site resolves that name by fetching `<name>.dc.html`, so naming
    // something that only exists under src/components/ costs the live page a
    // 404 for a component it was never going to render. A comment is the one
    // thing both readers already agree on — the legacy runtime ignores it, and
    // this generator is the only thing that looks inside.
    //
    // The name still needs its import line in convert-pages.mjs; a name without
    // one fails at `tsc` rather than in a browser.
    const slot = /^in-component:\s*([A-Z][A-Za-z0-9]*)\s*([\s\S]*)$/.exec(text);
    if (slot) {
      const [, component, rest] = slot;
      ctx.imports.add(component);
      const props = [...rest.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)]
        .map(([, key, value]) => ` ${key}=${JSON.stringify(value)}`)
        .join('');
      return `${INDENT(depth)}<${component}${props} />`;
    }

    return text ? `${INDENT(depth)}{/* ${text} */}` : '';
  }

  // A node the caller swapped for a component (see convert-pages.mjs).
  if (node.type === 'component') {
    return INDENT(depth) + node.source;
  }

  if (node.type === 'text') {
    // On a collapsed page the words leave the component and become a key. The
    // structure stays here, which is the whole point: one component, and the
    // sentences in a file per language.
    if (ctx.words && !hasBinding(node.value) && isCopy(node.value)) {
      // The whitespace stays inside the string. It looks like layout — the gap
      // after `<em>practice</em>` — but it is not: English needs that space
      // and Korean, where the verb ending runs straight on from the emphasis,
      // does not. Each language carries its own, so it has to travel with the
      // words rather than being fixed in the markup.
      const key = wordKey(ctx, ctx.parentTag, node.value);
      return `${INDENT(depth)}{t(${JSON.stringify(key)})}`;
    }
    const out = hasBinding(node.value) ? jsxTextWithBindings(node.value) : jsxText(node.value);
    return out ? INDENT(depth) + out : '';
  }

  const { tag } = node;

  // ---- control flow -------------------------------------------------------
  if (tag === 'sc-if') {
    const value = node.attrs.find((a) => a.name === 'value')?.value ?? '';
    const cond = asBinding(value) ?? 'true';
    const children = renderChildren(node, ctx, depth + 1);
    return `${INDENT(depth)}{${cond} ? (\n${INDENT(depth + 1)}<>\n${children}\n${INDENT(depth + 1)}</>\n${INDENT(depth)}) : null}`;
  }

  if (tag === 'sc-for') {
    const list = asBinding(node.attrs.find((a) => a.name === 'list')?.value ?? '') ?? '[]';
    const as = node.attrs.find((a) => a.name === 'as')?.value ?? 'item';
    const children = renderChildren(node, ctx, depth + 2);
    ctx.imports.add('Fragment');
    return (
      `${INDENT(depth)}{(${list} ?? []).map((${as}, ${as}Index) => (\n` +
      `${INDENT(depth + 1)}<Fragment key={${as}Index}>\n${children}\n${INDENT(depth + 1)}</Fragment>\n` +
      `${INDENT(depth)}))}`
    );
  }

  // ---- component slots ----------------------------------------------------
  if (tag === 'dc-import') {
    const name = node.attrs.find((a) => a.name === 'name')?.value ?? '';
    if (name === 'Nav' || name === 'Nav-KO') return ''; // SiteLayout renders it
    if (name === 'Footer' || name === 'Footer-KO') {
      const get = (k) => node.attrs.find((a) => a.name === k)?.value;
      ctx.footer = {
        loop: get('loop'),
        cta: get('cta'),
        stroke: get('stroke'),
      };
      return '';
    }
    if (name === 'ProjectIndexRail') {
      ctx.imports.add('ProjectIndexRail');
      const current = node.attrs.find((a) => a.name === 'current')?.value;
      return `${INDENT(depth)}<ProjectIndexRail${current ? ` current=${JSON.stringify(current)}` : ''} />`;
    }
    return '';
  }

  // Wrappers that contribute nothing to the output tree.
  if (tag === 'helmet' || tag === 'x-dc' || tag === '#root') {
    return renderChildren(node, ctx, depth);
  }

  // Document-head elements. The tokens and web fonts they pulled in are now
  // imported once by styles/global.css, so re-declaring them per page would
  // be a duplicate request — and a <link> in the body is invalid anyway.
  if (tag === 'link' || tag === 'meta' || tag === 'title' || tag === 'base') return '';

  // ---- element ------------------------------------------------------------
  let name = tag;
  const props = [];
  const attrOf = (key) => node.attrs.find((a) => a.name === key)?.value ?? null;

  // Some pages write the slot as `<x-import component-from-global-scope=
  // "image-slot" from="./image-slot.js">` — the design tool's long form for
  // the same element.
  if (tag === 'image-slot' || (tag === 'x-import' && attrOf('component-from-global-scope') === 'image-slot')) {
    ctx.imports.add('ImageSlot');
    name = 'ImageSlot';
  } else if (tag === 'x-import') {
    // Any other global-scope import is an authoring-tool widget with no
    // runtime here (the deck stage, for one). Drop it rather than emit an
    // element React would render as an unknown tag.
    return '';
  }

  // `data-in-form="stories"` was read by a global script on the legacy site.
  // It becomes a component that owns the submit, the upload and the status.
  if (tag === 'form' && attrOf('data-in-form')) {
    ctx.imports.add('SupabaseForm');
    name = 'SupabaseForm';
    props.push(`table=${JSON.stringify(attrOf('data-in-form'))}`);
    const thanks = attrOf('data-in-thanks');
    if (thanks) props.push(`thanks=${JSON.stringify(thanks)}`);
  }

  if (attrOf('data-chip-group')) {
    ctx.imports.add('ChipGroup');
    name = 'ChipGroup';
    props.push(`name=${JSON.stringify(attrOf('data-chip-group'))}`);
    if (node.attrs.some((a) => a.name === 'data-multi')) props.push('multi');
    // `data-label-id` names the group by pointing at the visible question
    // above it, which is the only place that text should live.
    for (const [attr, prop] of [
      ['data-sel-bg', 'selBg'], ['data-sel-fg', 'selFg'], ['data-sel-border', 'selBorder'],
      ['data-label-id', 'labelledBy'],
    ]) {
      const value = attrOf(attr);
      if (value) props.push(`${prop}=${JSON.stringify(value)}`);
    }
    ctx.chipDepth = (ctx.chipDepth ?? 0) + 1;
    const inner = renderChildren(node, ctx, depth + 1);
    ctx.chipDepth--;
    const chipProps = props.join(' ');
    const styleProp = node.attrs.find((a) => a.name === 'style');
    const styleText = styleProp
      ? ` style={${styleStringToObject(styleProp.value, styleOpts(ctx))}}`
      : '';
    return `${INDENT(depth)}<ChipGroup ${chipProps}${styleText}>
${inner}
${INDENT(depth)}</ChipGroup>`;
  }

  // A `data-value` inside a chip group is one chip.
  if (ctx.chipDepth && attrOf('data-value')) {
    ctx.imports.add('Chip');
    name = 'Chip';
    props.push(`value=${JSON.stringify(attrOf('data-value'))}`);
  }

  let isInternalLink = false;
  if (tag === 'a') {
    const href = node.attrs.find((a) => a.name === 'href')?.value ?? '';
    const to = ctx.resolveHref(href);
    if (to && to.internal) {
      isInternalLink = true;
      name = 'Link';
      ctx.imports.add('Link');
    }
  }

  for (const attr of node.attrs) {
    const lower = attr.name.toLowerCase();
    if (DROP_ATTR.has(lower)) continue;
    if (name === 'ImageSlot' && (lower === 'shape' || lower === 'mask' || lower === 'fit')) {
      // keep — ImageSlot understands these
    }

    const value = attr.value;

    // Boolean attribute with no value.
    if (value === null) {
      const key = ATTR[lower] ?? lower;
      props.push(BOOLEAN_PROPS.has(key) ? `${key}={true}` : `${key}`);
      continue;
    }

    // style
    if (lower === 'style') {
      const binding = asBinding(value);
      if (binding) {
        ctx.usesSx = true;
        props.push(`style={sx(${binding})}`);
      } else if (hasBinding(value)) {
        ctx.usesSx = true;
        props.push(`style={sx(\`${value.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => `\${${e.trim()}}`)}\`)}`);
      } else {
        props.push(`style={${styleStringToObject(value, styleOpts(ctx))}}`);
      }
      continue;
    }

    // alt, and the labels assistive technology reads aloud, are copy — they
    // describe the page to someone in the language they are reading it in.
    if (ctx.words && ['alt', 'aria-label', 'title'].includes(lower) && isCopy(value) && !asBinding(value)) {
      const react = lower === 'aria-label' ? 'aria-label' : lower;
      props.push(`${react}={t(${JSON.stringify(wordKey(ctx, lower, value))})}`);
      continue;
    }

    // href / src — rewrite to app routes and root-absolute asset paths.
    if (lower === 'href' && tag === 'a') {
      const binding = asBinding(value);
      if (binding) {
        props.push(isInternalLink ? `to={${binding}}` : `href={${binding}}`);
        continue;
      }
      const to = ctx.resolveHref(value);
      if (to && to.internal) {
        // One component serves every language, so its links cannot be written
        // in one. `localize` takes the twin where there is one and keeps the
        // default-locale page where there is not.
        props.push(
          ctx.localizeLinks
            ? `to={localize(${JSON.stringify(to.path)}, locale)}`
            : `to=${JSON.stringify(to.path)}`,
        );
      } else {
        props.push(`href=${JSON.stringify(to ? to.path : value)}`);
      }
      continue;
    }

    if (lower === 'src' || (lower === 'href' && tag === 'link')) {
      const binding = asBinding(value);
      if (binding) { props.push(`${lower}={${binding}}`); continue; }
      props.push(`${lower}=${JSON.stringify(ctx.resolveAsset(value))}`);
      continue;
    }

    // event handlers
    if (/^on[a-z]/i.test(lower)) {
      const binding = asBinding(value);
      const key = 'on' + lower.slice(2, 3).toUpperCase() + lower.slice(3);
      const react = { onMouseenter: 'onMouseEnter', onMouseleave: 'onMouseLeave' }[key] ?? key;
      if (binding) props.push(`${react}={${binding}}`);
      continue;
    }

    // everything else
    const key = ATTR[lower] ?? lower;
    const binding = asBinding(value);
    if (binding) {
      props.push(`${key}={${binding}}`);
    } else if (BOOLEAN_PROPS.has(key)) {
      // `required=""`, `required="required"` and a bare `required` all mean true;
      // only an explicit "false" means false.
      props.push(`${key}={${value.toLowerCase() === 'false' ? 'false' : 'true'}}`);
    } else if (NUMERIC_PROPS.has(key) && /^-?\d+(\.\d+)?$/.test(value.trim())) {
      props.push(`${key}={${value.trim()}}`);
    } else if (hasBinding(value)) {
      props.push(`${key}={\`${value.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => `\${${e.trim()}}`)}\`}`);
    } else {
      props.push(`${key}=${JSON.stringify(value)}`);
    }
  }

  // `style-hover` existed only because the old runtime had no stylesheet to
  // put a `:hover` rule in. It has exactly one value across the whole site.
  if (node.attrs.some((a) => a.name === 'style-hover')) {
    const idx = props.findIndex((p) => p.startsWith('className='));
    if (idx === -1) props.push('className="in-card"');
    else props[idx] = props[idx].replace(/className="([^"]*)"/, 'className="$1 in-card"');
  }

  // Links carrying their own colour opt out of the global anchor colour.
  if ((tag === 'a') && node.attrs.some((a) => a.name === 'style' && /(^|;)\s*color:/.test(a.value ?? ''))) {
    const idx = props.findIndex((p) => p.startsWith('className='));
    if (idx === -1) props.push('className="in-plain"');
    else props[idx] = props[idx].replace(/className="([^"]*)"/, 'className="$1 in-plain"');
  }

  const propsText = props.length ? ' ' + props.join(' ') : '';
  const selfClose = VOID.has(tag) || (name === 'ImageSlot' && node.children.length === 0);

  if (selfClose) return `${INDENT(depth)}<${name}${propsText} />`;

  if (name === 'style') {
    const css = node.children.map((c) => c.value).join('');
    ctx.styles.push(css);
    return '';
  }
  if (name === 'script') return '';

  const children = renderChildren(node, ctx, depth + 1);
  if (!children) return `${INDENT(depth)}<${name}${propsText} />`;
  return `${INDENT(depth)}<${name}${propsText}>\n${children}\n${INDENT(depth)}</${name}>`;
}

function renderChildren(node, ctx, depth) {
  // The tag a run of text sits inside, for naming its key. Saved and
  // restored rather than assigned: the walk is depth-first, so without
  // this the text after a nested element would be named for that element
  // instead of for its own parent.
  const outer = ctx.parentTag;
  ctx.parentTag = node.tag;
  const out = node.children
    .map((child) => toJsx(child, ctx, depth))
    .filter(Boolean)
    .join('\n');
  ctx.parentTag = outer;
  return out;
}

export { VOID, ATTR };
