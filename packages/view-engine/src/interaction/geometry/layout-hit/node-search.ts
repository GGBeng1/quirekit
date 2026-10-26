import {
  containsQuirePoint,
  measureQuireRectDistanceSquaredToPoint
} from "@quirekit/renderer";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import { isQuirePointerTransparentLayoutNode } from "../../layout-node-role";
import { isTextContentLayoutNode } from "./node-position";

/**
 * Finds the nearest editable text layout node to a document-blank point.
 *
 * @param nodes - Layout nodes to inspect.
 * @param point - Canvas point being hit-tested.
 * @returns Nearest editable text layout node, or null when none exists.
 */
export function findNearestEditableTextLayoutNodeToPoint(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint
): QuireLayoutNode | null {
  return findNearestLayoutNodeToPoint(nodes, point, isTextContentLayoutNode);
}

/**
 * Finds the nearest leaf layout node to a viewport point outside document bounds.
 *
 * @param nodes - Layout nodes to inspect.
 * @param point - Canvas point being hit-tested.
 * @param predicate - Optional filter used to ignore non-matching nodes.
 * @returns Nearest matching layout node, or null when none exists.
 */
export function findNearestLayoutNodeToPoint(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint,
  predicate: (node: QuireLayoutNode) => boolean = () => true
): QuireLayoutNode | null {
  const leafNodes = flattenLeafLayoutNodes(nodes).filter(predicate);
  let nearest: QuireLayoutNode | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of leafNodes) {
    const distance = measureLayoutNodeDistanceToPoint(node, point);

    if (distance < nearestDistance) {
      nearest = node;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Finds the deepest layout node whose rectangle contains a point.
 *
 * @param nodes - Layout nodes to inspect.
 * @param point - Canvas point being hit-tested.
 * @returns Deepest matching layout node, or null when none matches.
 */
export function findDeepestLayoutNodeAtPoint(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint
): QuireLayoutNode | null {
  for (const node of nodes) {
    if (
      isQuirePointerTransparentLayoutNode(node) ||
      !containsQuirePoint(node.rect, point)
    ) {
      continue;
    }

    return findDeepestLayoutNodeAtPoint(node.children ?? [], point) ?? node;
  }

  return null;
}

/**
 * Flattens layout nodes to their deepest selectable leaves.
 *
 * @param nodes - Layout nodes to flatten.
 * @returns Leaf layout nodes in document order.
 */
function flattenLeafLayoutNodes(
  nodes: readonly QuireLayoutNode[]
): readonly QuireLayoutNode[] {
  const leafNodes: QuireLayoutNode[] = [];

  for (const node of nodes) {
    if (isQuirePointerTransparentLayoutNode(node)) {
      continue;
    }

    const childLeaves = flattenLeafLayoutNodes(node.children ?? []);

    if (childLeaves.length > 0) {
      leafNodes.push(...childLeaves);
      continue;
    }

    leafNodes.push(node);
  }

  return leafNodes;
}

/**
 * Measures squared distance from a layout rectangle to a point.
 *
 * @param node - Layout node whose rectangle should be measured.
 * @param point - Canvas point being hit-tested.
 * @returns Squared distance from the point to the rectangle.
 */
function measureLayoutNodeDistanceToPoint(
  node: QuireLayoutNode,
  point: QuirePoint
): number {
  return measureQuireRectDistanceSquaredToPoint(node.rect, point);
}
