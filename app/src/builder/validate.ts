import { LOCALES, isLocale } from '../i18n/locales';
import { definitionFor } from './registry';
import { isElementType, type BuilderNode, type BuilderPage, type Json, type PageDocument } from './types';

/**
 * Checking a page document before anything renders it.
 *
 * A document is data from outside the program, so it is checked rather than
 * trusted: unknown element types, missing ids, duplicate ids, children on a
 * leaf, a tree deep enough to blow the stack. The renderer degrades around a
 * bad node — one broken heading should not take the page with it — but the
 * validator is what lets an editor or an API refuse the document up front,
 * which is the better place to catch it.
 */

/** Deeper than this is a mistake or an attack, not a layout. */
const MAX_DEPTH = 24;
const MAX_NODES = 2000;

export type IssueCode =
  | 'notAnObject'
  | 'nodesNotArray'
  | 'missingId'
  | 'duplicateId'
  | 'unknownElement'
  | 'childrenNotAllowed'
  | 'propsNotAnObject'
  | 'bindingsNotStrings'
  | 'tooDeep'
  | 'tooManyNodes'
  | 'unsupportedLocale'
  | 'emptySlug'
  | 'duplicateSlug';

export interface ValidationIssue {
  code: IssueCode;
  /** Where it is, as a readable path: `nodes[2].children[0]`. */
  at: string;
  /** Interpolation for the matching `builder:validation.*` message. */
  detail?: Record<string, string>;
}

export type ValidationResult =
  | { ok: true; issues: [] }
  | { ok: false; issues: ValidationIssue[] };

/**
 * The issues that stop a document being rendered at all.
 *
 * Everything else is per-node and degrades there instead: an unregistered
 * element type is the ordinary shape of a version skew — a document saved by a
 * newer build, opened by an older one — and one unknown heading should cost
 * one heading, not the page around it. An editor still sees every issue; only
 * these four make the renderer give up.
 */
const FATAL = new Set<IssueCode>(['notAnObject', 'nodesNotArray', 'tooDeep', 'tooManyNodes']);

/** True when the document is broken in a way the renderer cannot render around. */
export function isFatal(issues: readonly ValidationIssue[]): boolean {
  return issues.some((issue) => FATAL.has(issue.code) && !issue.at.includes('['));
}

function isPlainObject(value: unknown): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateDocument(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(input)) return { ok: false, issues: [{ code: 'notAnObject', at: 'document' }] };
  const nodes = (input as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) return { ok: false, issues: [{ code: 'nodesNotArray', at: 'document' }] };

  const seen = new Set<string>();
  let count = 0;

  const visit = (list: unknown[], path: string, depth: number): void => {
    if (depth > MAX_DEPTH) {
      issues.push({ code: 'tooDeep', at: path });
      return;
    }

    list.forEach((raw, index) => {
      const at = `${path}[${index}]`;
      if (++count > MAX_NODES) {
        if (count === MAX_NODES + 1) issues.push({ code: 'tooManyNodes', at });
        return;
      }
      if (!isPlainObject(raw)) {
        issues.push({ code: 'notAnObject', at });
        return;
      }

      const node = raw as unknown as BuilderNode;

      if (typeof node.id !== 'string' || !node.id.trim()) {
        issues.push({ code: 'missingId', at });
      } else if (seen.has(node.id)) {
        issues.push({ code: 'duplicateId', at, detail: { id: node.id } });
      } else {
        seen.add(node.id);
      }

      if (!isElementType(node.type) || !definitionFor(node.type)) {
        issues.push({ code: 'unknownElement', at, detail: { type: String(node.type) } });
        return;
      }

      if (node.props !== undefined && !isPlainObject(node.props)) {
        issues.push({ code: 'propsNotAnObject', at });
      }

      if (node.bindings !== undefined) {
        const bindingsOk =
          isPlainObject(node.bindings) &&
          Object.values(node.bindings).every((value) => typeof value === 'string');
        if (!bindingsOk) issues.push({ code: 'bindingsNotStrings', at });
      }

      if (node.children !== undefined) {
        if (!Array.isArray(node.children)) {
          issues.push({ code: 'nodesNotArray', at });
        } else if (node.children.length && !definitionFor(node.type)?.container) {
          issues.push({ code: 'childrenNotAllowed', at, detail: { type: node.type } });
        } else {
          visit(node.children, `${at}.children`, depth + 1);
        }
      }
    });
  };

  visit(nodes, 'nodes', 0);

  return issues.length ? { ok: false, issues } : { ok: true, issues: [] };
}

/** True when a document is safe to render, discarding the detail. */
export function isValidDocument(input: unknown): input is PageDocument {
  return validateDocument(input).ok;
}

/**
 * A whole page: its shared document, every locale's override, and the things
 * only the set can tell you — an unsupported locale key, a slug collision.
 */
export function validatePage(page: BuilderPage, others: BuilderPage[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];

  const shared = validateDocument(page.sharedDocument);
  if (!shared.ok) issues.push(...shared.issues.map((i) => ({ ...i, at: `sharedDocument.${i.at}` })));

  for (const [locale, data] of Object.entries(page.locales)) {
    if (!isLocale(locale)) {
      issues.push({ code: 'unsupportedLocale', at: `locales.${locale}`, detail: { locale } });
      continue;
    }
    if (!data) continue;

    if (!data.slug.trim()) {
      issues.push({ code: 'emptySlug', at: `locales.${locale}.slug` });
    } else {
      const clash = others.find((other) => other.id !== page.id && other.locales[locale]?.slug === data.slug);
      if (clash) {
        issues.push({
          code: 'duplicateSlug',
          at: `locales.${locale}.slug`,
          detail: { slug: data.slug, locale },
        });
      }
    }

    if (data.documentOverride) {
      const override = validateDocument(data.documentOverride);
      if (!override.ok) {
        issues.push(
          ...override.issues.map((i) => ({ ...i, at: `locales.${locale}.documentOverride.${i.at}` })),
        );
      }
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true, issues: [] };
}

/** The locales a page could be published in, for an editor's language list. */
export const SUPPORTED_LOCALES = LOCALES;
