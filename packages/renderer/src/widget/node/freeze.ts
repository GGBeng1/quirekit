import type { QuireViewNode } from "../types";

/**
 * Freezes a widget node.
 *
 * @param node - Widget node to freeze.
 * @returns Frozen widget node.
 */
export function freezeQuireViewNode<TNode extends QuireViewNode>(node: TNode): TNode {
  return Object.freeze(node);
}

/**
 * Freezes a child array.
 *
 * @param children - Child nodes to freeze into a stable array.
 * @returns Frozen child array.
 */
export function freezeChildren(children: readonly QuireViewNode[]): readonly QuireViewNode[] {
  return Object.freeze([...children]);
}
