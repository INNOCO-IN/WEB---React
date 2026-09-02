import type { Locale } from '../i18n/locales';

/**
 * The page-builder data model.
 *
 * The shape is one shared element tree plus one record of words per language.
 * That is the whole idea: a page's structure, colour and spacing are decided
 * once, and only the text is written three times. A language that genuinely
 * needs a different structure can take a copy of the tree and diverge, but it
 * has to say so — the default is to share.
 *
 * Nothing in a saved document is executable. `type` is a key into a registry
 * of components the app already contains; props are JSON. A page document that
 * arrives from a database cannot name a React component, an import path or a
 * function, because there is nowhere in these types to put one.
 */

/** Anything that survives a round trip through JSON, and nothing that does not. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * The elements a page may be built from.
 *
 * The first eight are generic primitives. The rest are this site's own content
 * blocks — the card walls that read from the database — registered the same
 * way, because a page that lists the workshops has to be able to say so
 * without anyone pasting a component name into page data.
 */
export const ELEMENT_TYPES = [
  'section',
  'container',
  'columns',
  'heading',
  'text',
  'image',
  'button',
  'spacer',
  'newsGrid',
  'workshopWall',
  'projectWall',
  'communityGrid',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export function isElementType(value: unknown): value is ElementType {
  return typeof value === 'string' && (ELEMENT_TYPES as readonly string[]).includes(value);
}

export interface BuilderNode {
  /**
   * Stable across languages, across layout overrides, and across saves.
   *
   * It is what a localized value is attached to and what a layout override is
   * matched against, so it is generated once and never derived from content —
   * a heading whose id came from its own text would lose every translation the
   * first time someone reworded it.
   */
  id: string;
  type: ElementType;
  /** Shared, language-independent settings: colour, spacing, alignment. */
  props: Record<string, Json>;
  /**
   * Prop name → key in `LocalePageData.content`.
   *
   * A bound prop takes its value from the active language's content record and
   * ignores whatever is in `props`. Keys are stable identifiers chosen by the
   * editor (`hero.title`), never the text itself.
   */
  bindings?: Record<string, string>;
  children?: BuilderNode[];
}

export interface PageDocument {
  nodes: BuilderNode[];
}

export interface LocalizedSEO {
  title: string;
  description: string;
  openGraphImage?: string;
}

export type PublishStatus = 'draft' | 'published';

export interface LocalePageData {
  /** The last URL segment in this language. Localized on purpose. */
  slug: string;
  /** Each language publishes on its own schedule. */
  status: PublishStatus;
  seo: LocalizedSEO;
  /** Binding key → the words, in this language. */
  content: Record<string, Json>;
  /**
   * A private copy of the element tree, for the rare page whose design has to
   * differ in this language. Absent means "use the shared document", which is
   * what almost every page should say.
   */
  documentOverride?: PageDocument;
}

export interface BuilderPage {
  /** Stable internal id. Never derived from a slug or a title. */
  id: string;
  /**
   * Stable, language-independent name for the route — `about`, `news`.
   *
   * The URL is built from the locale prefix and the *localized* slug, so this
   * is what stays constant when a language chooses a different slug, and what
   * the language switcher matches on.
   */
  routeKey: string;
  defaultLocale: Locale;
  sharedDocument: PageDocument;
  locales: Partial<Record<Locale, LocalePageData>>;
}

/* ------------------------------------------------------------ field schema */

export type FieldType =
  | 'text'
  | 'richText'
  | 'url'
  | 'image'
  | 'color'
  | 'select'
  | 'number'
  | 'length'
  | 'boolean';

/**
 * Whether a field's value belongs to one language or to all of them.
 *
 * Three states rather than a boolean, because the site needs all three: a
 * heading is always localized, a colour never is, and a link destination or an
 * image usually is not but sometimes must be — a Korean page linking to a
 * Korean PDF. `optional` means "shared unless this language overrides it",
 * which a boolean cannot express.
 */
export type FieldScope = 'localized' | 'shared' | 'optional';

export interface FieldDefinition {
  fieldType: FieldType;
  scope: FieldScope;
  /** Key into the `builder` translation namespace. */
  labelKey: string;
  options?: readonly string[];
  defaultValue?: Json;
}

/** True for the scopes whose values live in a locale's content record. */
export function isLocalizedScope(scope: FieldScope): boolean {
  return scope !== 'shared';
}
