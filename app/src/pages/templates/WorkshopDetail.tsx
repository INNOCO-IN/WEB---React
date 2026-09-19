import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteLayout from '../../components/SiteLayout';
import ImageSlot from '../../components/ImageSlot';
import WorkshopRegister from '../../components/WorkshopRegister';
import NotFound from '../NotFound';
import { WORKSHOP_DETAILS, type Run } from '../../lib/content/workshop-details';
import { accentColor } from '../../lib/content/types';
import { localize, useLocale } from '../../lib/lang';
import './WorkshopDetail.css';

/**
 * `/workshop/:slug` and `/ko/workshop/:slug` — a workshop, in full.
 *
 * Eight pages used to render this: Hero's Journey, Metanoia, Möbius Making and
 * Two Wings, each in English and Korean, 305 lines apiece. Forty-six of those
 * lines differed between any two of them, and every one of the forty-six was a
 * word or a colour.
 *
 * The Korean page is the same layout with the words translated, so it is the
 * same component — the language comes off the path, and the copy is keyed
 * `slug:lang`. That is what makes the EN/KR switch land on the same workshop
 * rather than on the Korean home page.
 *
 * All of it is extracted from `site/` by scripts/extract-workshop-pages.mjs,
 * down to the colour of each disc in the Loop, so the legacy page is still the
 * thing you edit and this file holds no copy of its own.
 *
 * The other six workshop pages are not on this layout and keep their own
 * components: Jungle Jam, Shadow Shifter and Light Shadow Shift share a second
 * shape, Bucket List and Second Life a third, and Pathfinder is its own. Their
 * routes are static, so they win over this one.
 */

const SANS = "'Archivo', sans-serif";
const SERIF = "'Newsreader', serif";

const ink = (alpha: number) => `rgba(46,59,64,${alpha})`;
const paper = (alpha: number) => `rgba(250,244,226,${alpha})`;

/** A paragraph whose emphasis was extracted as runs rather than as markup. */
function Runs({ runs, accent }: { runs: Run[]; accent: string }) {
  return (
    <>
      {runs.map((run, i) => (
        <Fragment key={i}>
          {run.em ? <em>{run.text}</em>
            : run.accent ? <span style={{ color: accent }}>{run.text}</span>
              : run.text}
        </Fragment>
      ))}
    </>
  );
}

export default function WorkshopDetail() {
  const { slug = '' } = useParams();
  const locale = useLocale();

  const w = WORKSHOP_DETAILS[`${slug}:${locale === 'ko' ? 'KO' : 'EN'}`];
  if (!w) return <NotFound />;

  const accent = accentColor(w.accent, 'var(--color-magenta-hot)');
  const card = accentColor(w.helpful.card, 'var(--color-blush)');

  return (
    <SiteLayout
      page={`Workshop-${slug}`}
      title={`${w.title} — IN`}
      className="page-workshop-detail"
      footer={{ loop: w.loop ?? undefined, cta: w.ctaAccent ? accentColor(w.ctaAccent) : undefined }}
    >
      <div className="ws" data-lang={locale}>
        <span id="top" />

        {/* ---------------------------------------------------------- hero */}
        <section style={{ background: accent, color: 'var(--color-paper)' }}>
          <div className="ws__back">
            <Link
              to={localize(w.back.to, locale)}
              className="in-plain"
              style={{
                fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: paper(0.78), textDecoration: 'none',
              }}
            >
              {w.back.label}
            </Link>
          </div>

          <div className="ws__hero">
            <div style={{ flex: '1 1 560px', minWidth: '300px' }}>
              <div
                style={{
                  fontFamily: SANS, fontWeight: '700', fontSize: '26px', lineHeight: '1.1',
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: paper(0.85),
                  marginBottom: '24px',
                }}
              >
                {w.eyebrow}
              </div>
              <h1
                style={{
                  fontFamily: SERIF, fontWeight: '600', fontSize: 'clamp(40px, 5.6vw, 82px)',
                  lineHeight: '1.0', letterSpacing: '-0.02em', margin: '0 0 22px',
                  maxWidth: '12ch', textWrap: 'balance',
                }}
              >
                {w.title}
              </h1>
              <p
                style={{
                  fontFamily: SERIF, fontWeight: '400', fontSize: 'clamp(20px, 2.3vw, 27px)',
                  lineHeight: '1.45', maxWidth: '640px', margin: '0 0 34px', color: paper(0.94),
                }}
              >
                {w.lede}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '36px', fontFamily: SANS, fontWeight: '700', fontSize: '13.5px' }}>
                {w.pills.map((pill) => (
                  <span key={pill} style={{ border: `1.5px solid ${paper(0.5)}`, borderRadius: '999px', padding: '9px 16px' }}>
                    {pill}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontFamily: SANS, fontWeight: '700', fontSize: '15px' }}>
                <a
                  href="#register"
                  className="in-plain"
                  style={{
                    textDecoration: 'none', color: accent, background: 'var(--color-paper)',
                    border: '1.5px solid var(--color-paper)', borderRadius: '999px', padding: '15px 32px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: '1.2', minHeight: '24px',
                  }}
                >
                  {w.register}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- intro + image */}
        <section className="ws__intro">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '52px', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 460px', minWidth: '300px' }}>
              <div
                style={{
                  fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: accent, marginBottom: '18px',
                }}
              >
                {w.intro.label}
              </div>
              {w.intro.paragraphs.map((para, i) => (
                <p
                  key={i}
                  style={i === 0
                    ? { fontFamily: SERIF, fontSize: 'clamp(21px, 2.2vw, 26px)', lineHeight: '1.5', margin: '0 0 20px', letterSpacing: '-0.005em' }
                    : { fontFamily: SERIF, fontSize: '19px', lineHeight: '1.55', margin: i === w.intro.paragraphs.length - 1 ? '0' : '0 0 18px', color: ink(0.82) }}
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Only where there is a photograph. Hero's Journey and Two Wings
                have a slot in the design and nothing in it; rendering the
                empty frame gives the reader a dashed box captioned "Drop
                workshop photo", which is a note to whoever fills the slot, and
                keeping the column without the frame gives them 380px of
                nothing. So the column goes with the picture. */}
            {w.intro.image?.src && (
              <div style={{ flex: '1 1 380px', minWidth: '280px' }}>
                <ImageSlot
                  id={w.intro.image.id ?? undefined}
                  src={w.intro.image.src}
                  alt={w.intro.image.alt ?? undefined}
                  shape="rect"
                  placeholder={w.intro.image.placeholder}
                  style={{ display: 'block', width: '100%', aspectRatio: w.intro.image.aspect }}
                />
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------ what we co-design */}
        <section className="ws__arc">
          <h2
            style={{
              fontFamily: SERIF, fontWeight: '600', fontSize: 'clamp(30px, 3.6vw, 46px)',
              lineHeight: '1.04', margin: '0 0 8px', letterSpacing: '-0.01em', textWrap: 'balance',
            }}
          >
            {w.codesign.heading}
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '19px', lineHeight: '1.5', maxWidth: '680px', margin: '0 0 40px', color: ink(0.78) }}>
            {w.codesign.lede}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {w.codesign.steps.map((step, i) => (
              <div
                key={step.n}
                className="ws__step"
                style={i === w.codesign.steps.length - 1 ? { borderBottom: `1.5px solid ${ink(0.18)}` } : undefined}
              >
                <span
                  style={{
                    flex: '0 0 auto', width: '52px', height: '52px', borderRadius: '50%',
                    background: accentColor(step.dot), color: step.dot === 'amber' ? 'var(--color-ink)' : 'var(--color-paper)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: SANS, fontWeight: '800', fontSize: '19px',
                  }}
                >
                  {step.n}
                </span>

                <div
                  style={{
                    flex: '0 0 auto', width: '190px', fontFamily: SANS, fontWeight: '800',
                    color: accentColor(step.labelColor),
                    ...(step.labelSize === 'caps'
                      ? { fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase' as const }
                      : { fontSize: '17px', letterSpacing: '0.04em' }),
                  }}
                >
                  {step.label}
                  {step.note && (
                    <span
                      style={{
                        display: 'block', fontFamily: SANS, fontWeight: '700', fontSize: '10.5px',
                        letterSpacing: '0.16em', color: accentColor(step.noteColor), marginTop: '3px',
                      }}
                    >
                      {step.note}
                    </span>
                  )}
                </div>

                <div style={{ flex: '1 1 320px', fontFamily: SERIF, fontSize: '22px', lineHeight: '1.34' }}>
                  {step.body}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: SERIF, fontSize: '19px', lineHeight: '1.55', maxWidth: '720px', margin: '30px 0 0', color: ink(0.82) }}>
            <Runs runs={w.codesign.closing} accent={accent} />
          </p>
        </section>

        {/* -------------------------------------------- helpful when… */}
        <section className="ws__helpful">
          <div className="ws__card" style={{ background: card }}>
            <h2
              style={{
                fontFamily: SERIF, fontWeight: '600', fontSize: 'clamp(26px, 3vw, 38px)',
                lineHeight: '1.08', margin: '0 0 28px', textWrap: 'balance',
              }}
            >
              {w.helpful.heading}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px 40px' }}>
              {w.helpful.items.map((item) => (
                <div key={item} style={{ display: 'flex', gap: '14px', alignItems: 'baseline', borderTop: `1.5px solid ${ink(0.25)}`, paddingTop: '14px' }}>
                  <span style={{ flex: '0 0 auto', color: 'var(--color-ink)', fontWeight: '800', fontFamily: SANS }}>→</span>
                  <span style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: '1.35' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- the details */}
        <section className="ws__details">
          <h2
            style={{
              fontFamily: SERIF, fontWeight: '600', fontSize: 'clamp(24px, 2.6vw, 32px)',
              lineHeight: '1.1', margin: '0 0 26px', textWrap: 'balance',
            }}
          >
            {w.details.heading}
          </h2>
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5px', background: ink(0.16), border: `1.5px solid ${ink(0.16)}`,
            }}
          >
            {w.details.facts.map((fact) => (
              <div key={fact.label} style={{ background: 'var(--color-paper)', padding: '22px 24px' }}>
                <div
                  style={{
                    fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: ink(0.55), marginBottom: '8px',
                  }}
                >
                  {fact.label}
                </div>
                <div style={{ fontFamily: SERIF, fontSize: '22px' }}>{fact.value}</div>
              </div>
            ))}
          </div>
          {/* Upright on the Korean page: Korean serif has no true italic, so
              the legacy page sets this one line normal. */}
          <p
            style={{
              fontFamily: SERIF, fontStyle: w.details.noteItalic ? 'italic' : 'normal',
              fontSize: '18px', lineHeight: '1.5', margin: '16px 0 0', color: ink(0.62),
            }}
          >
            {w.details.note}
          </p>
        </section>

        <section className="ws__top">
          <a
            href="#top"
            className="in-plain"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
              fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--color-paper)', background: 'var(--color-ink)',
              borderRadius: '999px', padding: '14px 26px',
            }}
          >
            {w.backToTop}
          </a>
        </section>

        {/* --------------------------------------------------- register */}
        <section id="register" style={{ background: accent, color: 'var(--color-paper)', marginTop: '8px' }}>
          <div className="ws__register">
            <p
              style={{
                fontFamily: SANS, fontWeight: '700', fontSize: '13px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: paper(0.75), margin: '0 0 18px',
              }}
            >
              {w.cta.eyebrow}
            </p>
            <h2
              style={{
                fontFamily: SERIF, fontWeight: '500', fontSize: 'clamp(32px, 4.6vw, 58px)',
                lineHeight: '1.06', margin: '0 0 28px', letterSpacing: '-0.01em', textWrap: 'balance',
              }}
            >
              {w.cta.heading}
            </h2>

            {/* What the hero's "Register now" has always pointed at, and now
                what it reaches. The links below it stay: one is for a question
                rather than a sign-up, the other is the way back to the wall. */}
            <WorkshopRegister slug={slug} accent={accent} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', fontFamily: SANS, fontWeight: '700', fontSize: '15px' }}>
              {w.cta.links.map((link, i) => (
                <Link
                  key={link.label}
                  to={localize(link.to, locale)}
                  className="in-plain"
                  style={i === 0
                    ? {
                        textDecoration: 'none', color: accent, background: 'var(--color-paper)',
                        borderRadius: '999px', padding: '15px 32px', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', lineHeight: '1.2', minHeight: '24px',
                      }
                    : {
                        textDecoration: 'none', color: 'var(--color-paper)', background: 'transparent',
                        border: `1.5px solid ${paper(0.7)}`, borderRadius: '999px', padding: '15px 32px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: '1.2', minHeight: '24px',
                      }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div id="connect" />
      </div>
    </SiteLayout>
  );
}
