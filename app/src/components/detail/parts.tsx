import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BriefFact, DetailLink } from '../../lib/content/detail-types';
import './detail.css';

/**
 * The parts a detail page is made of.
 *
 * Twelve pages — five project briefs, seven community write-ups — were the
 * same four blocks in the same order, differing only in their words and in
 * whether the band was gold with ink text or red with paper. They are these
 * components now, and the two templates in pages/templates are little more
 * than the order they go in.
 *
 * The type scale is written out rather than tokenised. `--text-display-2` and
 * the rest are fixed sizes; these headings are `clamp()`d against the
 * viewport, which the token set has no spelling for yet. Colour is tokenised,
 * because it has one.
 */

const SANS = "'Archivo', sans-serif";
const SERIF = "'Newsreader', serif";

/** Ink and paper at partial strength — the legacy pages' rgba(), by name. */
const ink = (alpha: number) => `rgba(46,59,64,${alpha})`;
const paper = (alpha: number) => `rgba(250,244,226,${alpha})`;

/** Whether a band carries ink text on a light colour, or paper on a dark one. */
export type Ink = 'ink' | 'paper' | string;

const on = (mode: Ink) => (mode === 'paper' ? paper : ink);

export interface HeroProps {
  accent: string;
  /** Text colour for the band: ink on a light accent, paper on a dark one. */
  mode: Ink;
  back: DetailLink;
  chips: string[];
  /** How the chips read: several pills on a project, one status pill on a community. */
  chipStyle?: 'pills' | 'status';
  title: string;
  lede: string;
}

/** The coloured band at the top: where you came from, what this is, and why. */
export function DetailHero({ accent, mode, back, chips, chipStyle = 'pills', title, lede }: HeroProps) {
  const tint = on(mode);
  const text = mode === 'paper' ? 'var(--color-paper)' : 'var(--color-ink)';

  return (
    <section style={{ background: accent, color: text }}>
      <div className="in-detail__hero">
        <Link
          to={back.to}
          className="in-plain"
          style={{
            fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: tint(mode === 'paper' ? 0.85 : 0.7),
            textDecoration: 'none', display: 'inline-block', marginBottom: '28px',
          }}
        >
          {back.label}
        </Link>

        {chips.length > 0 && (chipStyle === 'status' ? (
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '22px',
              fontFamily: SANS, fontWeight: '700', fontSize: '12px', letterSpacing: '0.12em',
              textTransform: 'uppercase', background: tint(0.18), borderRadius: '999px',
              padding: '8px 15px',
            }}
          >
            {chips[0]}
          </div>
        ) : (
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px',
              fontFamily: SANS, fontWeight: '800', fontSize: '12px', letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {chips.map((chip) => (
              <span key={chip} style={{ background: tint(0.14), borderRadius: '999px', padding: '8px 15px' }}>
                {chip}
              </span>
            ))}
          </div>
        ))}

        <h1
          style={{
            fontFamily: SERIF, fontWeight: '600', fontSize: 'clamp(40px, 5.6vw, 76px)',
            lineHeight: '1.0', letterSpacing: '-0.02em', margin: '0 0 22px', textWrap: 'balance',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: SERIF, fontWeight: '400', fontSize: 'clamp(19px, 2.1vw, 25px)',
            lineHeight: '1.46', maxWidth: '760px', margin: '0', color: tint(mode === 'paper' ? 0.94 : 0.85),
          }}
        >
          {lede}
        </p>
      </div>
    </section>
  );
}

export interface BriefGridProps {
  label: string;
  facts: BriefFact[];
  accent: string;
}

/**
 * The heading and the row of rule-topped fact cards under it.
 *
 * The facts are `Role`, `Location`, `Dates`, `Partners` — a term and what it
 * says about this project — so they are a description list rather than eight
 * unrelated divs, and the section's name is a real heading rather than 26px
 * of uppercase. The `<div>` between `<dl>` and each pair is allowed, and it
 * is what keeps each pair one grid cell.
 */
export function BriefGrid({ label, facts, accent }: BriefGridProps) {
  return (
    <>
      <h2
        style={{
          fontFamily: SANS, fontWeight: '700', fontSize: '26px', letterSpacing: '0.14em',
          lineHeight: '1.1', textTransform: 'uppercase', color: accent, margin: '0 0 24px',
        }}
      >
        {label}
      </h2>

      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '22px', maxWidth: '1000px', margin: '0' }}>
        {facts.map((fact) => (
          <div key={fact.label} style={{ borderTop: `1.5px solid ${ink(0.2)}`, paddingTop: '16px' }}>
            <dt
              style={{
                fontFamily: SANS, fontWeight: '800', fontSize: '13px', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: accent, marginBottom: '12px',
              }}
            >
              {fact.label}
            </dt>
            <dd style={{ fontFamily: SERIF, fontSize: '19px', lineHeight: '1.5', margin: '0', color: ink(0.82) }}>
              {fact.body}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** The ink pill a page uses to send you on to the project or circle beside it. */
export function InkLink({ link }: { link: DetailLink }) {
  return (
    <Link
      to={link.to}
      className="in-plain"
      style={{
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '12px',
        fontFamily: SANS, fontWeight: '700', fontSize: '15px', color: 'var(--color-paper)',
        background: 'var(--color-ink)', borderRadius: '999px', padding: '15px 32px',
        justifyContent: 'center', lineHeight: '1.2', minHeight: '24px',
      }}
    >
      {link.label}
    </Link>
  );
}

/**
 * The closing band, which is the same invitation on every detail page.
 *
 * Its words are chrome rather than content — no page varies them — so they
 * live here rather than in the extracted copy.
 */
export function ClosingBand({ accent }: { accent: string }) {
  return (
    <section style={{ background: accent, color: 'var(--color-paper)', marginTop: '80px' }}>
      <div className="in-detail__cta">
        <p
          style={{
            fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: paper(0.75), margin: '0 0 18px',
          }}
        >
          Are you IN?
        </p>
        <h2
          style={{
            fontFamily: SERIF, fontWeight: '500', fontSize: 'clamp(32px, 4.6vw, 58px)',
            lineHeight: '1.06', margin: '0 0 28px', letterSpacing: '-0.01em', textWrap: 'balance',
          }}
        >
          Every practice began as one conversation.
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', fontFamily: SANS, fontWeight: '700', fontSize: '15px' }}>
          <Link
            to="/connect"
            className="in-plain"
            style={{
              textDecoration: 'none', color: 'var(--color-teal)', background: 'var(--color-paper)',
              borderRadius: '999px', padding: '15px 32px', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', lineHeight: '1.2', minHeight: '24px',
            }}
          >
            Get involved
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * The page root every detail template sits in.
 *
 * It carries the accent as a custom property so ::selection can reach it —
 * a highlight cannot read a prop off the element it covers.
 */
export function DetailPage({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div className="in-detail" style={{ '--in-detail-accent': accent } as React.CSSProperties}>
      {children}
    </div>
  );
}
