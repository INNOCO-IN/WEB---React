import type { CSSProperties, ReactNode } from 'react';

/**
 * The `<image-slot>` placeholder from the design tool, as a plain component.
 *
 * On the legacy site this was a custom element you could drag a file onto, and
 * it persisted the drop to a sidecar JSON file next to the page. That editing
 * loop belongs to the authoring tool, not to the live website — so here a slot
 * shows its image when it has one, and its caption when it does not.
 */

export interface ImageSlotProps {
  id?: string;
  src?: string;
  alt?: string;
  placeholder?: string;
  shape?: 'rect' | 'rounded' | 'circle' | 'pill';
  radius?: string | number;
  mask?: string;
  fit?: 'cover' | 'contain';
  credit?: string;
  creditHref?: string;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

const RADIUS: Record<string, string> = {
  rect: '0',
  rounded: '12px',
  circle: '50%',
  pill: '999px',
};

export default function ImageSlot({
  src,
  alt,
  placeholder = 'Image',
  shape = 'rounded',
  radius,
  mask,
  fit = 'cover',
  credit,
  creditHref,
  style,
  className,
}: ImageSlotProps) {
  const frame: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius !== undefined ? `${radius}px` : RADIUS[shape] ?? RADIUS.rounded,
    ...(mask ? { clipPath: mask } : null),
    ...style,
  };

  if (!src) {
    return (
      <div
        className={['in-slot', 'in-slot--empty', className].filter(Boolean).join(' ')}
        style={{
          ...frame,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'var(--color-paper-dim)',
          border: '1px dashed var(--color-ink-12)',
          color: 'var(--color-ink-40)',
          font: 'var(--text-caption)',
          fontFamily: 'var(--font-sans)',
          textAlign: 'center',
        }}
        role="img"
        aria-label={alt ?? placeholder}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div className={['in-slot', className].filter(Boolean).join(' ')} style={frame}>
      <img
        src={src}
        alt={alt ?? placeholder}
        style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
      />
      {credit ? (
        <span
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            padding: '2px 6px',
            background: 'rgba(46,59,64,0.66)',
            color: 'var(--color-paper)',
            font: 'var(--text-label)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {creditHref ? (
            <a href={creditHref} target="_blank" rel="noopener" style={{ color: 'inherit' }}>
              {credit}
            </a>
          ) : (
            credit
          )}
        </span>
      ) : null}
    </div>
  );
}
