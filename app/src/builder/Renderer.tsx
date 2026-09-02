import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { definitionFor } from './registry';
import { resolveNodeProps } from './resolve';
import { isFatal, validateDocument } from './validate';
import type { BuilderNode, Json, PageDocument } from './types';
import './builder.css';

/**
 * Turning a page document into elements.
 *
 * Three rules, all of them about not trusting the document. Element types are
 * looked up in the registry and nothing else — there is no dynamic import and
 * no path in the data that could name one. A type that is not registered is
 * skipped rather than thrown on, so one bad node costs one node. And the whole
 * document is validated before any of it renders, so a malformed tree is
 * refused in one place instead of failing halfway down the page.
 *
 * Keys are the nodes' own ids, which is what keeps React state and scroll
 * position attached to the right element when a locale is switched or the
 * shared layout is edited.
 */

export interface RendererProps {
  document: PageDocument;
  /** Resolved content for the active locale, from `resolvePage`. */
  content: Record<string, Json>;
  /**
   * Keys whose value was borrowed from the fallback locale. Passing this turns
   * on the editor's outline; the public site leaves it undefined.
   */
  fallbackKeys?: ReadonlySet<string>;
  /** Name of the language borrowed values came from, for the outline's badge. */
  fallbackName?: string;
  /** Show a marker where an element could not be rendered. Editor only. */
  showProblems?: boolean;
}

export function BuilderRenderer({
  document,
  content,
  fallbackKeys,
  fallbackName = '',
  showProblems = false,
}: RendererProps) {
  const { t } = useTranslation('builder');
  const validation = useMemo(() => validateDocument(document), [document]);

  // Only structural damage stops the render. A node the registry does not
  // know is skipped where it stands, so the rest of the page survives it.
  if (!validation.ok && isFatal(validation.issues)) {
    if (!showProblems && !import.meta.env.DEV) return null;
    return (
      <div className="bx-problem" role="note">
        {t('validation.invalidDocument', {
          reason: validation.issues.map((issue) => `${issue.at}: ${issue.code}`).join(', '),
        })}
      </div>
    );
  }

  return (
    <>
      {document.nodes.map((node) => (
        <BuilderElement
          key={node.id}
          node={node}
          content={content}
          fallbackKeys={fallbackKeys}
          fallbackName={fallbackName}
          showProblems={showProblems}
        />
      ))}
    </>
  );
}

interface ElementNodeProps {
  node: BuilderNode;
  content: Record<string, Json>;
  fallbackKeys?: ReadonlySet<string>;
  fallbackName: string;
  showProblems: boolean;
}

function BuilderElement({
  node,
  content,
  fallbackKeys,
  fallbackName,
  showProblems,
}: ElementNodeProps) {
  const { t } = useTranslation('builder');
  const definition = definitionFor(node.type);

  if (!definition) {
    // Unknown types are the expected shape of a version skew: a document saved
    // by a newer build, opened by an older one. Silence on the public site,
    // a visible note anywhere someone could act on it.
    if (!showProblems && !import.meta.env.DEV) return null;
    return (
      <div className="bx-problem" role="note">
        {t('validation.unknownElement', { type: node.type })}
      </div>
    );
  }

  const Component = definition.component;
  const value = resolveNodeProps(node, content);

  const children = definition.container
    ? node.children?.map((child) => (
        <BuilderElement
          key={child.id}
          node={child}
          content={content}
          fallbackKeys={fallbackKeys}
          fallbackName={fallbackName}
          showProblems={showProblems}
        />
      ))
    : undefined;

  const element = <Component value={value}>{children}</Component>;

  const borrowed =
    fallbackKeys && node.bindings
      ? Object.values(node.bindings).filter((key) => fallbackKeys.has(key))
      : [];

  if (!borrowed.length) return element;

  // The editor has to be able to see that a value on screen is on loan. It is
  // an outline rather than a substitution, so the page still reads the way a
  // visitor will see it.
  return (
    <div
      className="bx-fallback"
      data-fallback-keys={borrowed.join(' ')}
      data-fallback-label={t('fallback.badge', { name: fallbackName })}
      title={t('fallback.title', { name: fallbackName })}
    >
      {element}
    </div>
  );
}

export default BuilderRenderer;
