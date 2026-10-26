import { doesQuireRectIntersectAny, type QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";

const floatingSubtrees = new WeakMap<QuireLayoutNode, boolean>();

/**
 * Tests paint visibility without treating a floating table's flow anchor as ink.
 * @param node - Immutable, page-projected content node.
 * @param clips - Document-space realization clips, or no clipping.
 * @returns Whether this node must be visited to emit visible content.
 */
export function doesQuireContentNodeIntersectClip(
  node: QuireLayoutNode,
  clips: readonly QuireRect[] | undefined
): boolean {
  if (clips === undefined
    || doesQuireRectIntersectAny(node.paintBounds ?? node.table?.rect ?? node.rect, clips)) {
    return true;
  }
  // A container can end at its zero-height flow anchor while a descendant is
  // painted at the page bottom. Descend to let the table's visual frame decide.
  return node.table === undefined && containsFloatingTable(node);
}

/**
 * Caches the exceptional subtree fact once per immutable layout node.
 * @param node - Content subtree that may contain out-of-flow table paint.
 * @returns Whether pruning by the container's flow rectangle would be unsafe.
 */
function containsFloatingTable(node: QuireLayoutNode): boolean {
  const cached = floatingSubtrees.get(node);
  if (cached !== undefined) return cached;
  const result = node.table?.floating != null
    || (node.children?.some(containsFloatingTable) ?? false);
  floatingSubtrees.set(node, result);
  return result;
}
