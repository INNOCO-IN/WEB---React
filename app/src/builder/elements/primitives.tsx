import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { accentColor } from '../../lib/content/types';
import { useLocale, localize } from '../../lib/lang';
import { bool, length, num, oneOf, safeHref, safeSrc, str } from '../props';
import type { Json } from '../types';

/**
 * The eight generic elements.
 *
 * Every visual value goes through the design tokens rather than a literal, so
 * a page assembled in the builder looks like the rest of the site by default
 * and restyles with it. Colours are token names — `magenta`, `tan` — resolved
 * by the same `accentColor` the card walls use; a raw hex still works where a
 * page genuinely needs one.
 */

export interface ElementProps {
  /** Props with every binding already resolved for the active locale. */
  value: Record<string, Json>;
  children?: ReactNode;
}

const ALIGN = ['left', 'center', 'right'] as const;
const LEVELS = ['1', '2', '3', '4', '5', '6'] as const;
const HEADING_SIZES = ['display-1', 'display-2', 'display-3', 'heading-1', 'heading-2'] as const;
const TEXT_SIZES = ['body', 'body-lg', 'eyebrow', 'quote'] as const;
const BUTTON_VARIANTS = ['solid', 'outline', 'plain'] as const;

/** Level to tag, as a table rather than a cast — `h${n}` is not a known tag. */
const HEADING_TAGS = {
  '1': 'h1', '2': 'h2', '3': 'h3', '4': 'h4', '5': 'h5', '6': 'h6',
} as const;

function textAlign(value: Json | undefined): CSSProperties['textAlign'] {
  return oneOf(value, ALIGN, 'left');
}

export function SectionElement({ value, children }: ElementProps) {
  const background = value.background ? accentColor(str(value.background)) : 'transparent';
  const color = value.color ? accentColor(str(value.color)) : undefined;

  return (
    <section
      style={{
        background,
        color,
        paddingTop: length(value.paddingTop, '64px'),
        paddingBottom: length(value.paddingBottom, '64px'),
      }}
    >
      <div
        style={{
          maxWidth: length(value.maxWidth, '1320px'),
          margin: '0 auto',
          paddingLeft: length(value.paddingX, '28px'),
          paddingRight: length(value.paddingX, '28px'),
          textAlign: textAlign(value.align),
        }}
      >
        {children}
      </div>
    </section>
  );
}

export function ContainerElement({ value, children }: ElementProps) {
  const row = oneOf(value.direction, ['column', 'row'] as const, 'column') === 'row';

  return (
    <div
      style={{
        maxWidth: length(value.maxWidth, 'none'),
        marginLeft: bool(value.centered, false) ? 'auto' : undefined,
        marginRight: bool(value.centered, false) ? 'auto' : undefined,
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        flexWrap: row ? 'wrap' : undefined,
        justifyContent: row
          ? oneOf(value.justify, ['flex-start', 'center', 'flex-end'] as const, 'flex-start')
          : undefined,
        alignItems: row ? 'center' : undefined,
        gap: length(value.gap, '0px'),
        textAlign: textAlign(value.align),
      }}
    >
      {children}
    </div>
  );
}

export function ColumnsElement({ value, children }: ElementProps) {
  // `count` sets a floor rather than a fixed track list, so the grid collapses
  // on a narrow screen the way every legacy page's grid does.
  const count = Math.max(1, Math.min(6, num(value.count, 2)));
  const min = length(value.minColumnWidth, `${Math.round(1200 / count)}px`);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`,
        gap: length(value.gap, '34px'),
        alignItems: oneOf(value.alignItems, ['start', 'center', 'stretch'] as const, 'start'),
      }}
    >
      {children}
    </div>
  );
}

export function HeadingElement({ value }: ElementProps) {
  const Tag = HEADING_TAGS[oneOf(value.level, LEVELS, '2')];
  const size = oneOf(value.size, HEADING_SIZES, 'heading-1');

  return (
    <Tag
      style={{
        font: `var(--text-${size})`,
        fontFamily: 'var(--font-serif)',
        color: value.color ? accentColor(str(value.color)) : undefined,
        textAlign: textAlign(value.align),
        letterSpacing: '-0.01em',
        textWrap: 'balance',
        margin: 0,
      }}
    >
      {str(value.text)}
    </Tag>
  );
}

export function TextElement({ value }: ElementProps) {
  const size = oneOf(value.size, TEXT_SIZES, 'body');
  const eyebrow = size === 'eyebrow';

  return (
    <p
      style={{
        font: `var(--text-${size})`,
        fontFamily: eyebrow ? 'var(--font-sans)' : 'var(--font-serif)',
        letterSpacing: eyebrow ? 'var(--tracking-eyebrow)' : undefined,
        textTransform: eyebrow ? 'uppercase' : undefined,
        color: value.color ? accentColor(str(value.color)) : undefined,
        textAlign: textAlign(value.align),
        maxWidth: length(value.maxWidth, '68ch'),
        margin: 0,
      }}
    >
      {str(value.text)}
    </p>
  );
}

export function ImageElement({ value }: ElementProps) {
  const src = safeSrc(value.src);
  if (!src) return null;

  return (
    <img
      src={src}
      // Empty alt is a real answer, not a missing one: a decorative image
      // should be skipped by a screen reader rather than announced by filename.
      alt={str(value.alt)}
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: length(value.maxWidth, '100%'),
        aspectRatio: str(value.aspect) || undefined,
        objectFit: oneOf(value.fit, ['cover', 'contain'] as const, 'cover'),
        marginLeft: str(value.align) === 'center' ? 'auto' : undefined,
        marginRight: str(value.align) === 'center' ? 'auto' : undefined,
      }}
    />
  );
}

export function ButtonElement({ value }: ElementProps) {
  const locale = useLocale();
  const label = str(value.label);
  const href = safeHref(value.url);
  const variant = oneOf(value.variant, BUTTON_VARIANTS, 'solid');
  const accent = accentColor(str(value.color), 'var(--color-ink)');

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: 'var(--text-button)',
    fontFamily: 'var(--font-sans)',
    letterSpacing: 'var(--tracking-button)',
    borderRadius: 'var(--radius-pill, 999px)',
    padding: '15px 32px',
    lineHeight: 1.2,
    textDecoration: 'none',
    background: variant === 'solid' ? accent : 'transparent',
    color: variant === 'solid' ? 'var(--color-paper)' : accent,
    border: variant === 'plain' ? 'none' : `1.5px solid ${accent}`,
  };

  if (!href) return <span style={style}>{label}</span>;

  const external = /^(https?:|mailto:|tel:)/i.test(href);
  if (external) {
    return (
      <a href={href} className="in-plain" style={style} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} className="in-plain" style={style}>
        {label}
      </a>
    );
  }
  // Internal links follow the reader's language where a translated page
  // exists, and stay on the default-locale page where one does not.
  return (
    <Link to={localize(href, locale)} className="in-plain" style={style}>
      {label}
    </Link>
  );
}

export function SpacerElement({ value }: ElementProps) {
  return <div aria-hidden="true" style={{ height: length(value.height, '32px') }} />;
}
