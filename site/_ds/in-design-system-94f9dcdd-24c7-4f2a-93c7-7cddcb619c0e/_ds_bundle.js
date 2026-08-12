/* @ds-bundle: {"format":4,"namespace":"INDesignSystem_94f9dc","components":[{"name":"HalftoneCard","sourcePath":"components/cards/HalftoneCard.jsx"},{"name":"ImageCard","sourcePath":"components/cards/ImageCard.jsx"},{"name":"OutlineCard","sourcePath":"components/cards/OutlineCard.jsx"},{"name":"SolidCard","sourcePath":"components/cards/SolidCard.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Text","sourcePath":"components/core/Text.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"Header","sourcePath":"components/navigation/Header.jsx"}],"sourceHashes":{"components/cards/HalftoneCard.jsx":"a75f865ea184","components/cards/ImageCard.jsx":"b5e49c7894df","components/cards/OutlineCard.jsx":"f9e1312a64ea","components/cards/SolidCard.jsx":"1eaac43dfd2b","components/core/Button.jsx":"29cf27183401","components/core/Eyebrow.jsx":"9f6070c49d6f","components/core/Tag.jsx":"3ea23ca58ec2","components/core/Text.jsx":"29f48d516f61","components/forms/Input.jsx":"da55e19c9f7d","components/forms/Select.jsx":"45f740e0bced","components/navigation/Footer.jsx":"1b6af6a7d567","components/navigation/Header.jsx":"c2a284345ec7","ui_kits/website/screens/AboutIn.jsx":"aed53445b96f","ui_kits/website/screens/Connect.jsx":"7f7597bc23ae","ui_kits/website/screens/Landing.jsx":"e2f72408789e","ui_kits/website/screens/Workshop.jsx":"d41111bdc277"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.INDesignSystem_94f9dc = window.INDesignSystem_94f9dc || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cards/HalftoneCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * HalftoneCard — radial dot-grid texture over a solid accent, reserved
 * exclusively for network / cross-link moments (e.g. Community, Collectives).
 * This is the ONLY place texture/pattern appears in the system.
 */
function HalftoneCard({
  accent = 'var(--color-green)',
  label = 'NETWORK',
  title,
  children,
  style,
  ...rest
}) {
  const dotBg = {
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1.5px)',
    backgroundSize: '10px 10px'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      background: accent,
      color: 'var(--color-paper)',
      padding: '28px 24px 28px 52px',
      minHeight: 220,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 8,
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      ...dotBg,
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 20,
      top: 24,
      bottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--color-paper)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      transform: 'rotate(180deg)',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      opacity: 0.85
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-heading-2)',
      fontFamily: 'var(--font-serif)'
    }
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body)',
      fontFamily: 'var(--font-serif)',
      opacity: 0.92
    }
  }, children) : null));
}
Object.assign(__ds_scope, { HalftoneCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/HalftoneCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/ImageCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ImageCard — photo up top with an overlaid square badge; dim-paper body below.
 * Photography should crop to 4:3, 1:1, or 3:4 — documentary/human, never stock-glossy.
 */
function ImageCard({
  image,
  badge,
  title,
  children,
  aspect = '4 / 3',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-page-dim)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: aspect,
      background: '#00000022',
      overflow: 'hidden'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : null, badge ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 16,
      top: 16,
      background: 'var(--color-ink)',
      color: 'var(--color-paper)',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      padding: '6px 12px'
    }
  }, badge) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 24px 24px'
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-heading-2)',
      fontFamily: 'var(--font-serif)',
      color: 'var(--color-ink)',
      marginBottom: 8
    }
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body)',
      fontFamily: 'var(--font-serif)',
      color: 'var(--text-muted)'
    }
  }, children) : null));
}
Object.assign(__ds_scope, { ImageCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ImageCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/OutlineCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * OutlineCard — outline on paper, used for quotes and understated content.
 * A small rotated "VOICES" style label may run along the left edge with a dot.
 */
function OutlineCard({
  label,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      border: 'var(--border-width) solid var(--color-ink)',
      padding: '28px 24px 28px 52px',
      minHeight: 220,
      display: 'flex',
      alignItems: 'center',
      font: 'var(--text-quote)',
      fontFamily: 'var(--font-serif)',
      color: 'var(--color-ink)',
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 20,
      top: 24,
      bottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--color-ink)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      transform: 'rotate(180deg)',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--color-ink)',
      opacity: 0.6
    }
  }, label)) : null, /*#__PURE__*/React.createElement("div", null, children));
}
Object.assign(__ds_scope, { OutlineCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/OutlineCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/SolidCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SolidCard — flat accent-color background, ink or paper text, with a small
 * rotated label + dot running along the left edge. The default card for
 * workshop/story/community grids.
 */
function SolidCard({
  accent = 'var(--color-teal)',
  label,
  eyebrow,
  title,
  children,
  textColor,
  style,
  ...rest
}) {
  const dark = ['var(--color-ink)', 'var(--color-plum)', 'var(--color-deepblue)', 'var(--color-green)', 'var(--color-magenta)'];
  const isDark = dark.includes(accent);
  const fg = textColor || (isDark ? 'var(--color-paper)' : 'var(--color-ink)');
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      background: accent,
      color: fg,
      padding: '28px 24px 28px 52px',
      minHeight: 220,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 8,
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 20,
      top: 24,
      bottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: fg
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      transform: 'rotate(180deg)',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      opacity: 0.85
    }
  }, label)) : null, eyebrow ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-eyebrow)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      opacity: 0.85
    }
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-heading-2)',
      fontFamily: 'var(--font-serif)'
    }
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body)',
      fontFamily: 'var(--font-serif)',
      opacity: 0.92
    }
  }, children) : null);
}
Object.assign(__ds_scope, { SolidCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/SolidCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — full pill radius always; never a rounded-rect.
 * variant: primary (filled teal), secondary (outline), nav (small filled pill),
 * icon (circular, for arrow/next affordances).
 */
function Button({
  children,
  variant = 'primary',
  size = 'default',
  iconOnly = false,
  disabled = false,
  as = 'button',
  href,
  onClick,
  style,
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-sans)',
    font: 'var(--text-button)',
    letterSpacing: 'var(--tracking-button)',
    borderRadius: 'var(--radius-pill)',
    border: 'var(--border-width) solid transparent',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'transform var(--duration-fast) var(--ease-standard), background var(--duration-standard) var(--ease-standard)',
    textDecoration: 'none',
    whiteSpace: 'nowrap'
  };
  const sizes = {
    default: iconOnly ? {
      width: 44,
      height: 44,
      padding: 0
    } : {
      padding: '13px 26px'
    },
    small: iconOnly ? {
      width: 36,
      height: 36,
      padding: 0
    } : {
      padding: '9px 18px',
      font: 'var(--text-caption)'
    }
  };
  const variants = {
    primary: {
      background: 'var(--color-teal)',
      color: 'var(--color-paper)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--color-ink)',
      borderColor: 'var(--color-ink)'
    },
    'secondary-inverse': {
      background: 'transparent',
      color: 'var(--color-paper)',
      borderColor: 'var(--color-paper)'
    },
    nav: {
      background: 'var(--color-ink)',
      color: 'var(--color-paper)'
    },
    icon: {
      background: 'var(--color-ink)',
      color: 'var(--color-paper)',
      borderRadius: 'var(--radius-circle)'
    }
  };
  const Tag = href ? 'a' : as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onClick: disabled ? undefined : onClick,
    disabled: Tag === 'button' ? disabled : undefined,
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'translateY(0)';
    }
  }, rest), iconOnly ? children || '→' : children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Eyebrow — uppercase kicker label used above headlines and section numbers.
 * Always teal on paper sections, paper on ink sections.
 */
function Eyebrow({
  children,
  inverse = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      font: 'var(--text-eyebrow)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: inverse ? 'var(--color-paper)' : 'var(--color-teal)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — small pill label. `light` sits on paper (outline), `dark` is filled ink,
 * `image` is the square badge overlaid on photography (never a pill).
 */
function Tag({
  children,
  variant = 'light',
  style,
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-sans)',
    font: 'var(--text-label)',
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    padding: '6px 14px'
  };
  const variants = {
    light: {
      borderRadius: 'var(--radius-pill)',
      border: 'var(--border-width) solid var(--color-ink)',
      color: 'var(--color-ink)',
      background: 'transparent'
    },
    dark: {
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-ink)',
      color: 'var(--color-paper)'
    },
    image: {
      borderRadius: 'var(--radius-none)',
      background: 'var(--color-ink)',
      color: 'var(--color-paper)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/core/Text.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANT_TAGS = {
  'display-1': 'h1',
  'display-2': 'h1',
  'display-3': 'h1',
  'heading-1': 'h2',
  'heading-2': 'h3',
  'body-lg': 'p',
  body: 'p',
  quote: 'p',
  eyebrow: 'div',
  nav: 'span',
  button: 'span',
  label: 'div',
  caption: 'div'
};
const TRACKING_BY_VARIANT = {
  eyebrow: 'var(--tracking-eyebrow)',
  label: 'var(--tracking-label)',
  button: 'var(--tracking-button)'
};
const UPPERCASE_VARIANTS = new Set(['eyebrow', 'label']);

/**
 * Text — the single place every page pulls type from. Pick a `variant`
 * (matching a --text-* token) instead of writing `font`/`color`/`letterSpacing`
 * by hand; every page then stays in sync when a token changes.
 *
 * Font family, size, line-height, and default weight all come from the
 * --text-{variant} token in tokens/typography.css. Color defaults to
 * --text-primary (or --text-primary-inverse when `inverse`) and can be
 * overridden per-instance. Weight and letter-spacing (kerning) can also be
 * overridden per-instance, e.g. to bump a single headline to 700.
 */
function Text({
  as,
  variant = 'body',
  color,
  inverse = false,
  weight,
  tracking,
  italic = false,
  align,
  children,
  style,
  ...rest
}) {
  const Tag = as || VARIANT_TAGS[variant] || 'span';
  const resolvedColor = color || (inverse ? 'var(--text-primary-inverse)' : 'var(--text-primary)');
  const resolvedTracking = tracking || TRACKING_BY_VARIANT[variant];
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      margin: 0,
      font: `var(--text-${variant})`,
      color: resolvedColor,
      ...(weight ? {
        fontWeight: weight
      } : null),
      ...(resolvedTracking ? {
        letterSpacing: resolvedTracking
      } : null),
      ...(UPPERCASE_VARIANTS.has(variant) ? {
        textTransform: 'uppercase'
      } : null),
      ...(italic ? {
        fontStyle: 'italic'
      } : null),
      ...(align ? {
        textAlign: align
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Text });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Text.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — square corners, ink-tinted border at rest, teal border on focus.
 * Serif value text, sans uppercase label above.
 */
function Input({
  label,
  id,
  style,
  ...rest
}) {
  const inputId = id || `in-input-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--color-ink)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    style: {
      font: 'var(--text-body)',
      fontFamily: 'var(--font-serif)',
      color: 'var(--color-ink)',
      background: 'var(--surface-card)',
      border: 'var(--border-width) solid var(--color-ink-12)',
      borderRadius: 'var(--radius-none)',
      padding: '12px 14px',
      outline: 'none'
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = 'var(--color-teal)';
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = 'var(--color-ink-12)';
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — same square-corner, ink-border treatment as Input.
 */
function Select({
  label,
  id,
  children,
  style,
  ...rest
}) {
  const selectId = id || `in-select-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--color-ink)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("select", _extends({
    id: selectId,
    style: {
      font: 'var(--text-body)',
      fontFamily: 'var(--font-serif)',
      color: 'var(--color-ink)',
      background: 'var(--surface-card)',
      border: 'var(--border-width) solid var(--color-ink-12)',
      borderRadius: 'var(--radius-none)',
      padding: '12px 14px',
      outline: 'none'
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = 'var(--color-teal)';
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = 'var(--color-ink-12)';
    }
  }, rest), children));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Footer — ink background, paper text, top divider hairline at 20% opacity,
 * logo mark + wordmark, tagline right-aligned. Site-wide legal line included.
 */
function Footer({
  logo,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("footer", _extends({
    style: {
      background: 'var(--color-ink)',
      color: 'var(--color-paper)',
      padding: '48px var(--content-side-padding) 32px',
      borderTop: 'var(--border-width-hairline) solid var(--color-ink-20)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, logo ? /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "IN",
    style: {
      height: 22,
      width: 'auto'
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-nav)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 800
    }
  }, "INNOCO")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-heading-2)',
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      textAlign: 'right',
      opacity: 0.9
    }
  }, "Are you IN?")), /*#__PURE__*/React.createElement("p", {
    style: {
      lineHeight: 1.6,
      fontFamily: 'Roboto',
      opacity: 0.65,
      fontWeight: 200,
      width: 1272,
      height: 154,
      color: '#9E9E9B',
      fontStyle: 'italic'
    }
  }, "\xA9 2015\u20132026 INNOCO. All rights reserved. The use of any content, video, photograph, illustration, or image on this website without the written permission of INNOCO is strictly prohibited. in.innoco@gmail.com \xB7 Seoul, Korea. ME=WE framework and workshop materials are shared under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License."));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Header.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Header — sticky, blurred paper background, 1px ink-12% bottom border.
 * Logo mark + wordmark left, nav labels center/right, small filled nav pill CTA.
 */
function Header({
  logo,
  items = ['ABOUT IN', 'ME=WE', 'WORKSHOP', 'STORY', 'COMMUNITY'],
  cta = 'CONNECT',
  onCta,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      padding: '18px var(--content-side-padding)',
      background: 'rgba(250, 244, 226, 0.85)',
      backdropFilter: 'blur(8px)',
      borderBottom: 'var(--border-width-hairline) solid var(--color-ink-12)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, logo ? /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "IN",
    style: {
      height: 24,
      width: 'auto'
    }
  }) : null), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 28
    }
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      font: 'var(--text-nav)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-ink)',
      textDecoration: 'none',
      letterSpacing: '0.02em'
    }
  }, it))), /*#__PURE__*/React.createElement("button", {
    onClick: onCta,
    style: {
      font: 'var(--text-caption)',
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      background: 'var(--color-ink)',
      color: 'var(--color-paper)',
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      padding: '10px 20px',
      cursor: 'pointer'
    }
  }, cta));
}
Object.assign(__ds_scope, { Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/screens/AboutIn.jsx
try { (() => {
// IN website UI kit — About IN screen
function ScreenAboutIn({
  nav
}) {
  const {
    Button,
    Eyebrow,
    Text,
    HalftoneCard,
    ImageCard,
    Header,
    Footer
  } = window.INDesignSystem_94f9dc;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Header, {
    logo: "../../assets/logos/in-mark.png",
    onCta: () => nav('connect')
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '64px 28px 40px',
      maxWidth: 780,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "ABOUT IN"), /*#__PURE__*/React.createElement(Text, {
    as: "h1",
    variant: "display-3",
    style: {
      margin: '16px 0 20px'
    }
  }, "A small studio with a long question."), /*#__PURE__*/React.createElement(Text, {
    variant: "body-lg",
    style: {
      margin: '0 0 20px'
    }
  }, "IN (INNOCO) is a small studio built on one idea: personal growth and the wellbeing of the people around us aren't separate things. We call this ME=WE."), /*#__PURE__*/React.createElement(Text, {
    variant: "body",
    color: "var(--text-muted)",
    style: {
      margin: '0 0 28px'
    }
  }, "Everything we do \u2014 workshops, projects with our neighbors, the way we teach \u2014 is a way of practicing that idea, not just talking about it. We run workshops built around the ME=WE Arc \u2014 head, heart, and hand working together, through nature, science, art, and social action."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => nav('workshop')
  }, "See the Framework \u2192")), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-ink)',
      padding: '64px 28px',
      margin: '40px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 780,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Text, {
    variant: "quote",
    italic: true,
    inverse: true,
    style: {
      margin: 0
    }
  }, "What kind of ancestor do I want to be?"))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 28px 80px',
      maxWidth: 1320,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(HalftoneCard, {
    accent: "var(--color-plum)",
    label: "NETWORK",
    title: "IN-Collectives Worldwide"
  }, "Independent partners who carry this work forward, in their own local contexts."), /*#__PURE__*/React.createElement(ImageCard, {
    badge: "TEAM",
    title: "Yunsun Chung"
  }, "Founder, CEO & Facilitation Lead."), /*#__PURE__*/React.createElement(ImageCard, {
    badge: "TEAM",
    title: "Taegun Kim"
  }, "Creative Officer \u2014 sculptor, participatory public artist.")), /*#__PURE__*/React.createElement(Footer, {
    logo: "../../assets/logos/in-mark.png"
  }));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/screens/AboutIn.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/screens/Connect.jsx
try { (() => {
// IN website UI kit — Connect screen
function ScreenConnect({
  nav
}) {
  const {
    Button,
    Eyebrow,
    Text,
    Input,
    Select,
    Header,
    Footer
  } = window.INDesignSystem_94f9dc;
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Header, {
    logo: "../../assets/logos/in-mark.png",
    onCta: () => nav('connect')
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '64px 28px 40px',
      maxWidth: 780,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "CONNECT"), /*#__PURE__*/React.createElement(Text, {
    as: "h1",
    variant: "display-3",
    style: {
      margin: '16px 0 32px'
    }
  }, "Every practice starts with a conversation."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 22,
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-teal)',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement(Text, {
    as: "div",
    variant: "heading-2",
    inverse: true,
    style: {
      marginBottom: 8
    }
  }, "Join a Workshop"), /*#__PURE__*/React.createElement(Text, {
    variant: "body",
    inverse: true,
    style: {
      opacity: 0.9,
      marginBottom: 16
    }
  }, "Ready to try one? Register for an open workshop, or ask us to bring one to your group."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary-inverse",
    onClick: () => nav('workshop')
  }, "Find a Workshop \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-ink)',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement(Text, {
    as: "div",
    variant: "heading-2",
    inverse: true,
    style: {
      marginBottom: 8
    }
  }, "Join the Operation"), /*#__PURE__*/React.createElement(Text, {
    variant: "body",
    inverse: true,
    style: {
      opacity: 0.85,
      marginBottom: 16
    }
  }, "Want to go further \u2014 as a Bridge Builder, Facilitator, or IN-Collective? This is where it begins."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary-inverse"
  }, "Start a Conversation \u2192"))), !sent ? /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      maxWidth: 480
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    placeholder: "Your name",
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
    required: true
  }), /*#__PURE__*/React.createElement(Select, {
    label: "What you're reaching out about"
  }, /*#__PURE__*/React.createElement("option", null, "Join a Workshop"), /*#__PURE__*/React.createElement("option", null, "Join the Operation"), /*#__PURE__*/React.createElement("option", null, "Support"), /*#__PURE__*/React.createElement("option", null, "Press / Other")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    as: "button"
  }, "Send")) : /*#__PURE__*/React.createElement(Text, {
    variant: "quote",
    italic: true
  }, "You're IN.")), /*#__PURE__*/React.createElement(Footer, {
    logo: "../../assets/logos/in-mark.png"
  }));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/screens/Connect.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/screens/Landing.jsx
try { (() => {
// IN website UI kit — Landing screen
function ScreenLanding({
  nav
}) {
  const {
    Button,
    Eyebrow,
    Text,
    SolidCard,
    OutlineCard,
    Header,
    Footer
  } = window.INDesignSystem_94f9dc;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Header, {
    logo: "../../assets/logos/in-mark.png",
    onCta: () => nav('connect')
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '80px 28px 60px',
      maxWidth: 900,
      margin: '0 auto',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "START WITHIN \xB7 SHARE THE SPACE \xB7 SERVE THE WHOLE"), /*#__PURE__*/React.createElement(Text, {
    as: "h1",
    variant: "display-2",
    style: {
      margin: '18px 0 20px'
    }
  }, "What if ", /*#__PURE__*/React.createElement(Text, {
    as: "em",
    variant: "display-2",
    color: "var(--color-magenta)",
    italic: true,
    style: {
      display: 'inline'
    }
  }, "ME"), " and ", /*#__PURE__*/React.createElement(Text, {
    as: "em",
    variant: "display-2",
    color: "var(--color-teal)",
    italic: true,
    style: {
      display: 'inline'
    }
  }, "WE"), " were never actually two things?"), /*#__PURE__*/React.createElement(Text, {
    variant: "body-lg",
    color: "var(--text-muted)",
    style: {
      maxWidth: 640,
      margin: '0 0 28px'
    }
  }, "IN is a studio where we practice ME=WE through honest conversations and artful expressions."), /*#__PURE__*/React.createElement(Text, {
    variant: "quote",
    italic: true,
    style: {
      margin: '0 0 32px'
    }
  }, "Are you IN?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => nav('workshop')
  }, "Explore ME=WE"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => nav('workshop')
  }, "Join a Studio"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => nav('connect')
  }, "Connect"))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 28px 80px',
      maxWidth: 1320,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(SolidCard, {
    accent: "var(--color-magenta)",
    label: "WORKSHOP",
    eyebrow: "CORE WORKSHOP \xB7 START HERE",
    title: "ME=WE M\xF6bius Making"
  }, "The first experience of ME=WE as something lived, not explained."), /*#__PURE__*/React.createElement(OutlineCard, {
    label: "VOICES"
  }, "\"A cool grandma in the making.\" \u2014 Yunsun Chung, first IN-Collective."), /*#__PURE__*/React.createElement(SolidCard, {
    accent: "var(--color-amber)",
    label: "COMMUNITY",
    eyebrow: "ON-GOING",
    title: "Food Revolution for Social Change"
  }, "Youth-led social innovation, since 2016.")), /*#__PURE__*/React.createElement(Footer, {
    logo: "../../assets/logos/in-mark.png"
  }));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/screens/Landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/screens/Workshop.jsx
try { (() => {
// IN website UI kit — Workshop index screen
function ScreenWorkshop({
  nav
}) {
  const {
    Button,
    Eyebrow,
    Tag,
    Text,
    SolidCard,
    HalftoneCard,
    Header,
    Footer
  } = window.INDesignSystem_94f9dc;
  const cardOnly = ['Two Wings', "Hero's Journey", 'Second Life Series', 'Bucket List', "Women's Retreat"];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Header, {
    logo: "../../assets/logos/in-mark.png",
    onCta: () => nav('connect')
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '64px 28px 32px',
      maxWidth: 780,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "WORKSHOP"), /*#__PURE__*/React.createElement(Text, {
    as: "h1",
    variant: "display-3",
    style: {
      margin: '16px 0 12px'
    }
  }, "Where practice becomes a lifestyle."), /*#__PURE__*/React.createElement(Text, {
    variant: "body",
    color: "var(--text-muted)"
  }, "No lectures here. Every workshop is built on conversation and making \u2014 guided by questions you respond to, not reply to. Every one walks the same arc: IGNITE \u2192 ME\u2260WE \u2192 ME+WE \u2192 (ME WE) \u2192 ME=WE \u2192 GLOW.")), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 28px 24px',
      maxWidth: 1320,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(SolidCard, {
    accent: "var(--color-teal)",
    label: "WORKSHOP",
    eyebrow: "CORE WORKSHOP \xB7 START HERE",
    title: "ME=WE M\xF6bius Making",
    style: {
      minHeight: 260
    }
  }, "The first experience of ME=WE as something lived, not explained. Open to anyone \u2014 this is where the path begins.", /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "REGISTER")))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 28px 40px',
      maxWidth: 1320,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(SolidCard, {
    accent: "var(--color-deepblue)",
    label: "TRAIN",
    eyebrow: "FACILITATOR TRAINING",
    title: "Pathfinder"
  }, "Facilitator training: learn the workshop from the inside, then carry it forward."), /*#__PURE__*/React.createElement(SolidCard, {
    accent: "var(--color-plum)",
    label: "ORG",
    eyebrow: "WORKSHOP \xB7 FEATURED",
    title: "METANOIA"
  }, "Change from within \u2014 a four-day intensive for people who hold space for others."), /*#__PURE__*/React.createElement(HalftoneCard, {
    accent: "var(--color-green)",
    label: "YOUTH",
    title: "Jungle Jam"
  }, "Leave the ordinary. Meet yourself. A residential gathering for young people.")), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 28px 80px',
      maxWidth: 1320,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, cardOnly.map(w => /*#__PURE__*/React.createElement(Tag, {
    key: w,
    variant: "light"
  }, w)))), /*#__PURE__*/React.createElement(Footer, {
    logo: "../../assets/logos/in-mark.png"
  }));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/screens/Workshop.jsx", error: String((e && e.message) || e) }); }

__ds_ns.HalftoneCard = __ds_scope.HalftoneCard;

__ds_ns.ImageCard = __ds_scope.ImageCard;

__ds_ns.OutlineCard = __ds_scope.OutlineCard;

__ds_ns.SolidCard = __ds_scope.SolidCard;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Text = __ds_scope.Text;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.Header = __ds_scope.Header;

})();
