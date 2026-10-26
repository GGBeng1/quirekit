import type { Node as PMNode } from "@quirekit/pm";
import type { QuireNodePredicate, QuireNodeWithPos, QuireRange } from "../types";

/**
 * Finds descendant nodes inside a range that match a predicate.
 *
 * @param node - Root node to search.
 * @param range - Document range to search.
 * @param predicate - Predicate used to match descendants.
 * @returns Matching nodes with their positions.
 */
export function findChildrenInRange(
  node: PMNode,
  range: QuireRange,
  predicate: QuireNodePredicate
): QuireNodeWithPos[] {
  const nodesWithPos: QuireNodeWithPos[] = [];

  node.nodesBetween(range.from, range.to, (child, pos) => {
    if (predicate(child)) {
      nodesWithPos.push({ node: child, pos });
    }
  });

  return nodesWithPos;
}
