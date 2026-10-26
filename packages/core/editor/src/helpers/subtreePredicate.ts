import type { Node as PMNode } from "@quirekit/pm";

/**
 * Creates a memoized test for whether a node or any of its descendants matches.
 *
 * ProseMirror nodes are immutable and shared between document versions, so
 * after an edit only nodes on the changed path are evaluated again. `matches`
 * must depend on the node alone (type, attributes, marks, text), never on its
 * position or document.
 *
 * @param matches - Pure predicate over one node.
 * @returns Test whether the node's subtree contains a match.
 */
export function createQuireSubtreePredicate(
  matches: (node: PMNode) => boolean
): (node: PMNode) => boolean {
  const memo = new WeakMap<PMNode, boolean>();
  const contains = (node: PMNode): boolean => {
    if (node.isText) return matches(node);
    const known = memo.get(node);
    if (known !== undefined) return known;
    let result = matches(node);
    for (let index = 0; !result && index < node.childCount; index += 1) {
      result = contains(node.child(index));
    }
    memo.set(node, result);
    return result;
  };
  return contains;
}

/**
 * Visits descendants like `node.descendants`, skipping subtrees with no match.
 *
 * Positions, parents, indices and returning `false` to skip a node's children
 * follow `descendants`; only nodes whose subtree contains a match are visited.
 *
 * @param node - Root whose descendants are visited.
 * @param contains - Subtree test from {@link createQuireSubtreePredicate}.
 * @param visit - Receives each visited node, its position, parent and index.
 */
export function visitQuireMatchingDescendants(
  node: PMNode,
  contains: (node: PMNode) => boolean,
  visit: (node: PMNode, position: number, parent: PMNode | null, index: number) => boolean | void
): void {
  const walk = (parent: PMNode, start: number): void => {
    parent.forEach((child, offset, index) => {
      if (!contains(child)) return;
      const position = start + offset;
      if (visit(child, position, parent, index) !== false && child.childCount > 0) walk(child, position + 1);
    });
  };
  walk(node, 0);
}
