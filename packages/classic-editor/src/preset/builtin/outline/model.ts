import type { QuireNodeCanvasTextStyleMap } from "@quirekit/core";
import type { QuireKitTreeNode } from "@quirekit/ui";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { ClassicEditorRenderContext } from "../../../types";
import type { ClassicEditorOutlineEntry, ClassicEditorOutlineIdentityResolver, ClassicEditorOutlineTree } from "./types";
export type { ClassicEditorOutlineEntry, ClassicEditorOutlineTree } from "./types";

/** Mutable node used only while nesting the flat document outline. */
interface MutableOutlineNode {
  /** Stable TreeView id. */
  readonly id: string;
  /** Visible heading text. */
  readonly label: string;
  /** Nested headings in document order. */
  readonly children: MutableOutlineNode[];
}

/**
 * Collects heading facts from the current canonical document.
 *
 * @param context - Mounted product context.
 * @param untitledLabel - Fallback for an empty heading.
 * @param resolveIdentity - Optional mounted occurrence registry.
 * @returns Flat heading entries in document order.
 */
export function collectClassicEditorOutlineEntries(
  context: ClassicEditorRenderContext,
  untitledLabel: string,
  resolveIdentity?: ClassicEditorOutlineIdentityResolver
): readonly ClassicEditorOutlineEntry[] {
  const entries: ClassicEditorOutlineEntry[] = [];
  // Resolve definitions once for this synchronous projection; dynamic node
  // callbacks still run below, and the next projection reads fresh factories.
  const styles = context.editor.state.extensions.map(extension => extension.canvasTextStyle);
  context.editor.state.doc.descendants((node, position) => {
    const level = resolveClassicDocumentOutlineLevel(styles, node);
    if (level === null) return true;
    entries.push(Object.freeze({
      id: resolveIdentity?.(node, position) ?? `outline-${position}`,
      label: node.textContent || untitledLabel,
      level,
      position
    }));
    return false;
  });
  return Object.freeze(entries);
}

/**
 * Projects flat heading levels into a semantic hierarchy for TreeView.
 *
 * A skipped level attaches to the nearest preceding shallower heading. This
 * keeps document order and produces the same hierarchy screen readers expect
 * from the visual indentation.
 *
 * @param entries - Flat canonical heading facts.
 * @param previous - Previous presentation available for structural sharing.
 * @returns Immutable TreeView nodes, position lookup, and initial expansion.
 */
export function createClassicEditorOutlineTree(
  entries: readonly ClassicEditorOutlineEntry[],
  previous?: ClassicEditorOutlineTree
): ClassicEditorOutlineTree {
  const roots: MutableOutlineNode[] = [];
  const stack: Array<{ readonly level: number; readonly node: MutableOutlineNode }> = [];
  const positions = new Map<string, number>();
  const previousNodes = new Map<string, QuireKitTreeNode>();
  /** @param nodes - Retained nodes to index across possible reparenting. */
  function indexPrevious(nodes: readonly QuireKitTreeNode[]): void {
    for (const node of nodes) {
      previousNodes.set(node.id, node);
      indexPrevious(node.children ?? []);
    }
  }
  indexPrevious(previous?.nodes ?? []);

  for (const entry of entries) {
    while (stack.length > 0 && stack[stack.length - 1]!.level >= entry.level) stack.pop();
    const node: MutableOutlineNode = {
      id: entry.id,
      label: entry.label,
      children: []
    };
    const parent = stack[stack.length - 1]?.node;
    if (parent === undefined) roots.push(node);
    else parent.children.push(node);
    positions.set(entry.id, entry.position);
    stack.push({ level: entry.level, node });
  }

  const defaultExpandedValue: string[] = [];

  /**
   * Freezes one mutable branch and records its default expansion.
   *
   * @param node - Mutable construction node.
   * @returns Public immutable TreeView node.
   */
  function freezeNode(node: MutableOutlineNode): QuireKitTreeNode {
    const old = previousNodes.get(node.id);
    if (node.children.length > 0) defaultExpandedValue.push(node.id);
    const children = node.children.map(freezeNode);
    if (old?.label === node.label && sameValues(old.children ?? [], children)) return old;
    const retainedChildren = old?.children !== undefined && sameValues(old.children, children)
      ? old.children : Object.freeze(children);
    return Object.freeze({
      id: node.id,
      label: node.label,
      ...(children.length === 0 ? {} : { children: retainedChildren })
    });
  }

  const nodes = roots.map(freezeNode);
  return Object.freeze({
    nodes: previous !== undefined && sameValues(previous.nodes, nodes) ? previous.nodes : Object.freeze(nodes),
    positions,
    defaultExpandedValue: previous !== undefined && sameValues(previous.defaultExpandedValue, defaultExpandedValue)
      ? previous.defaultExpandedValue : Object.freeze(defaultExpandedValue)
  });
}

/** @param previous - Retained ordered values. @param current - Newly projected values. @returns Whether identity and order are unchanged. */
function sameValues<Value>(previous: readonly Value[], current: readonly Value[]): boolean {
  return previous.length === current.length && previous.every((value, index) => value === current[index]);
}

/**
 * Resolves the Extension-owned outline level for one document node.
 *
 * @param styles - Current projection's Extension-owned definitions, in priority order.
 * @param node - Candidate document node.
 * @returns One-based outline level, or null for non-outline content.
 */
export function resolveClassicDocumentOutlineLevel(
  styles: readonly (QuireNodeCanvasTextStyleMap | undefined)[],
  node: ProseMirrorNode
): number | null {
  for (const definition of styles) {
    const style = definition?.[node.type.name]?.(node);
    if (
      style?.documentOutlineLevel !== undefined
      && Number.isInteger(style.documentOutlineLevel)
      && style.documentOutlineLevel > 0
    ) return style.documentOutlineLevel;
  }
  const legacyLevel = node.type.name === "heading" ? node.attrs.level : null;
  return typeof legacyLevel === "number" && Number.isInteger(legacyLevel)
    ? legacyLevel
    : null;
}
