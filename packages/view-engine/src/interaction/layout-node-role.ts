import type { QuireLayoutNode } from "../layout";

/**
 * Checks whether pointer and caret queries must skip one retained layout node.
 *
 * @param node - Layout node to inspect.
 * @param includeSourceGeometry - Whether an accepted target may read its source geometry.
 * @returns Whether the node is helper geometry or currently paint-only content.
 */
export function isQuirePointerTransparentLayoutNode(
  node: QuireLayoutNode,
  includeSourceGeometry = false
): boolean {
  return node.interactionRole === "paint-only"
    || (!includeSourceGeometry && node.interactionRole === "source-geometry");
}

/**
 * Checks whether a layout node represents an empty textblock content slot.
 *
 * @param node - Layout node to inspect.
 * @returns Whether the node should map blank clicks to its inner editable slot.
 */
export function isQuireEmptyTextblockLayoutNode(node: QuireLayoutNode): boolean {
  return (
    node.kind === "block" &&
    node.range.to - node.range.from === 2 &&
    (node.textFragments?.length ?? 0) === 0
  );
}
