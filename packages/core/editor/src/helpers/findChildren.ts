import type { Node as PMNode } from "@quirekit/pm";
import type { QuireNodePredicate, QuireNodeWithPos } from "../types";

/**
 * Finds descendant nodes that match a predicate.
 *
 * @param node - Root node to search.
 * @param predicate - Predicate used to match descendants.
 * @returns Matching nodes with their positions.
 */
export function findChildren(
  node: PMNode,
  predicate: QuireNodePredicate
): QuireNodeWithPos[] {
  const nodesWithPos: QuireNodeWithPos[] = [];

  node.descendants((child, pos) => {
    if (predicate(child)) {
      nodesWithPos.push({ node: child, pos });
    }
  });

  return nodesWithPos;
}
