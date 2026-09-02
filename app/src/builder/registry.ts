import type { ComponentType } from 'react';
import {
  ButtonElement,
  ColumnsElement,
  ContainerElement,
  HeadingElement,
  ImageElement,
  SectionElement,
  SpacerElement,
  TextElement,
  type ElementProps,
} from './elements/primitives';
import {
  CommunityGridElement,
  NewsGridElement,
  ProjectWallElement,
  WorkshopWallElement,
} from './elements/blocks';
import type { ElementType, FieldDefinition } from './types';

/**
 * The one place that decides what a page may contain.
 *
 * Two jobs, deliberately together. It maps an element type to the component
 * that renders it — an explicit table, so saved page data can never name a
 * component or reach an import — and it declares, per field, whether the value
 * belongs to one language or to all of them.
 *
 * That second half is the reason this file exists rather than the decisions
 * living in the editor. "Is the button's colour shared?" has to have the same
 * answer in the editor's form, in the renderer's binding resolution, and in
 * the translation-progress count. One table means it does.
 */

export interface ElementDefinition {
  type: ElementType;
  /** Key into the `builder` translation namespace. */
  labelKey: string;
  /** Whether the element renders children. Leaves reject them at validation. */
  container: boolean;
  fields: Record<string, FieldDefinition>;
  component: ComponentType<ElementProps>;
}

/** Shared field shorthands — every one of these is a design decision, not a word. */
const shared = (
  fieldType: FieldDefinition['fieldType'],
  labelKey: string,
  extra: Partial<FieldDefinition> = {},
): FieldDefinition => ({ fieldType, scope: 'shared', labelKey, ...extra });

const localized = (
  fieldType: FieldDefinition['fieldType'],
  labelKey: string,
  extra: Partial<FieldDefinition> = {},
): FieldDefinition => ({ fieldType, scope: 'localized', labelKey, ...extra });

/** Shared unless a language overrides it — a link to a translated document. */
const optional = (
  fieldType: FieldDefinition['fieldType'],
  labelKey: string,
  extra: Partial<FieldDefinition> = {},
): FieldDefinition => ({ fieldType, scope: 'optional', labelKey, ...extra });

const ALIGN = ['left', 'center', 'right'] as const;

export const ELEMENT_REGISTRY: Record<ElementType, ElementDefinition> = {
  section: {
    type: 'section',
    labelKey: 'elements.section',
    container: true,
    component: SectionElement,
    fields: {
      background: shared('color', 'fields.background'),
      color: shared('color', 'fields.color'),
      paddingTop: shared('length', 'fields.padding', { defaultValue: '64px' }),
      paddingBottom: shared('length', 'fields.padding', { defaultValue: '64px' }),
      paddingX: shared('length', 'fields.padding', { defaultValue: '28px' }),
      maxWidth: shared('length', 'fields.maxWidth', { defaultValue: '1320px' }),
      align: shared('select', 'fields.align', { options: ALIGN, defaultValue: 'left' }),
    },
  },

  container: {
    type: 'container',
    labelKey: 'elements.container',
    container: true,
    component: ContainerElement,
    fields: {
      direction: shared('select', 'fields.align', {
        options: ['column', 'row'],
        defaultValue: 'column',
      }),
      justify: shared('select', 'fields.align', {
        options: ['flex-start', 'center', 'flex-end'],
        defaultValue: 'flex-start',
      }),
      maxWidth: shared('length', 'fields.maxWidth'),
      gap: shared('length', 'fields.gap', { defaultValue: '0px' }),
      centered: shared('boolean', 'fields.align', { defaultValue: false }),
      align: shared('select', 'fields.align', { options: ALIGN, defaultValue: 'left' }),
    },
  },

  columns: {
    type: 'columns',
    labelKey: 'elements.columns',
    container: true,
    component: ColumnsElement,
    fields: {
      count: shared('number', 'fields.count', { defaultValue: 2 }),
      gap: shared('length', 'fields.gap', { defaultValue: '34px' }),
      minColumnWidth: shared('length', 'fields.maxWidth'),
      alignItems: shared('select', 'fields.align', {
        options: ['start', 'center', 'stretch'],
        defaultValue: 'start',
      }),
    },
  },

  heading: {
    type: 'heading',
    labelKey: 'elements.heading',
    container: false,
    component: HeadingElement,
    fields: {
      text: localized('text', 'fields.text'),
      level: shared('select', 'fields.level', {
        options: ['1', '2', '3', '4', '5', '6'],
        defaultValue: '2',
      }),
      size: shared('select', 'fields.size', {
        options: ['display-1', 'display-2', 'display-3', 'heading-1', 'heading-2'],
        defaultValue: 'heading-1',
      }),
      align: shared('select', 'fields.align', { options: ALIGN, defaultValue: 'left' }),
      color: shared('color', 'fields.color'),
    },
  },

  text: {
    type: 'text',
    labelKey: 'elements.text',
    container: false,
    component: TextElement,
    fields: {
      text: localized('richText', 'fields.text'),
      size: shared('select', 'fields.size', {
        options: ['body', 'body-lg', 'eyebrow', 'quote'],
        defaultValue: 'body',
      }),
      align: shared('select', 'fields.align', { options: ALIGN, defaultValue: 'left' }),
      color: shared('color', 'fields.color'),
      maxWidth: shared('length', 'fields.maxWidth', { defaultValue: '68ch' }),
    },
  },

  image: {
    type: 'image',
    labelKey: 'elements.image',
    container: false,
    component: ImageElement,
    fields: {
      // The asset is usually the same picture in every language, and sometimes
      // is not — a photograph of a signboard, a diagram with words in it.
      src: optional('image', 'fields.src'),
      // The alternative text describes the picture to someone who cannot see
      // it, in the language they are reading. Always localized.
      alt: localized('text', 'fields.alt'),
      aspect: shared('text', 'fields.aspect'),
      fit: shared('select', 'fields.size', { options: ['cover', 'contain'], defaultValue: 'cover' }),
      maxWidth: shared('length', 'fields.maxWidth'),
      align: shared('select', 'fields.align', { options: ALIGN, defaultValue: 'left' }),
    },
  },

  button: {
    type: 'button',
    labelKey: 'elements.button',
    container: false,
    component: ButtonElement,
    fields: {
      label: localized('text', 'fields.label'),
      url: optional('url', 'fields.url'),
      variant: shared('select', 'fields.variant', {
        options: ['solid', 'outline', 'plain'],
        defaultValue: 'solid',
      }),
      color: shared('color', 'fields.color'),
    },
  },

  spacer: {
    type: 'spacer',
    labelKey: 'elements.spacer',
    container: false,
    component: SpacerElement,
    fields: {
      height: shared('length', 'fields.height', { defaultValue: '32px' }),
    },
  },

  /* --------------------------------------------- the site's content blocks */

  newsGrid: {
    type: 'newsGrid',
    labelKey: 'elements.newsGrid',
    container: false,
    component: NewsGridElement,
    fields: {
      feed: shared('select', 'fields.feed', {
        options: ['home', 'news', 'community', 'story', 'project'],
        defaultValue: 'news',
      }),
      limit: shared('number', 'fields.limit'),
    },
  },

  workshopWall: {
    type: 'workshopWall',
    labelKey: 'elements.workshopWall',
    container: false,
    component: WorkshopWallElement,
    fields: {},
  },

  projectWall: {
    type: 'projectWall',
    labelKey: 'elements.projectWall',
    container: false,
    component: ProjectWallElement,
    fields: {},
  },

  communityGrid: {
    type: 'communityGrid',
    labelKey: 'elements.communityGrid',
    container: false,
    component: CommunityGridElement,
    fields: {},
  },
};

export function definitionFor(type: string): ElementDefinition | null {
  return Object.hasOwn(ELEMENT_REGISTRY, type)
    ? ELEMENT_REGISTRY[type as ElementType]
    : null;
}

/** The field names on an element whose values live in a locale's content. */
export function localizedFields(type: ElementType): string[] {
  const definition = ELEMENT_REGISTRY[type];
  return Object.entries(definition.fields)
    .filter(([, field]) => field.scope !== 'shared')
    .map(([name]) => name);
}

/** The field names an editor must fill in to call a locale finished. */
export function requiredLocalizedFields(type: ElementType): string[] {
  const definition = ELEMENT_REGISTRY[type];
  return Object.entries(definition.fields)
    .filter(([, field]) => field.scope === 'localized')
    .map(([name]) => name);
}
