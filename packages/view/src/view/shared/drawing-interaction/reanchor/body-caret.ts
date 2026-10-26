import {
  doQuireRectsIntersect,
  measureQuireRectDistanceSquaredToPoint,
  type QuirePoint,
  type QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutNode,
  QuireLayoutPage
} from "@quirekit/view-engine";

const CARET_QUERY_INSET = 0.5;

/**
 * Finds a point inside the nearest editable body-owned node on one page.
 *
 * Candidate ownership is filtered before distance comparison. This prevents a
 * header or footer caret from winning a boundary tie after a drawing is
 * clamped from the page gap into the target body.
 *
 * @param root - Accepted retained layout root.
 * @param point - Requested point already clamped to the target body.
 * @param page - Target page whose body must own the source position.
 * @returns Interior query point for the nearest body text node, or undefined.
 */
export function findNearestBodyCaretPoint(
  root: QuireLayoutNode,
  point: QuirePoint,
  page: QuireLayoutPage
): QuirePoint | undefined {
  let nearest: QuireLayoutNode | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  // Phase 1: ownership and editability are hard constraints. Distance only
  // ranks candidates that can legally become the drawing's body source.
  visitLayoutNodes(root, (node) => {
    if (!isBodyTextCandidate(node, page)) {
      return;
    }
    const distance = measureQuireRectDistanceSquaredToPoint(node.rect, point);
    if (distance < nearestDistance) {
      nearest = node;
      nearestDistance = distance;
    }
  });

  // Phase 2: query just inside the chosen node. Avoiding its exact boundary
  // keeps retained nearest-caret tie breaking from selecting an adjacent story.
  return nearest === undefined
    ? undefined
    : clampPointToRectInterior(point, nearest.rect);
}

/**
 * Visits a retained layout tree in document order.
 *
 * @param node - Current layout subtree.
 * @param visitor - Callback invoked for every retained node.
 * @returns Nothing.
 */
function visitLayoutNodes(
  node: QuireLayoutNode,
  visitor: (node: QuireLayoutNode) => void
): void {
  visitor(node);
  for (const child of node.children ?? []) {
    visitLayoutNodes(child, visitor);
  }
}

/**
 * Checks whether a node can supply an editable body caret on the target page.
 *
 * @param node - Layout node to inspect.
 * @param page - Target page ownership and geometry.
 * @returns Whether the node is a legal body text candidate.
 */
function isBodyTextCandidate(
  node: QuireLayoutNode,
  page: QuireLayoutPage
): boolean {
  const region = node.layoutOwner?.region ?? node.viewRegion;
  return region?.kind === "body"
    && node.interactionRole !== "paint-only"
    && node.interactionRole !== "source-geometry"
    && node.range.to >= page.range.from
    && node.range.from <= page.range.to
    && doQuireRectsIntersect(node.rect, page.pageRect)
    && ((node.textFragments?.length ?? 0) > 0 || isEmptyTextblock(node));
}

/**
 * Checks whether a block represents an empty editable text slot.
 *
 * @param node - Layout node to inspect.
 * @returns Whether the node is an empty textblock projection.
 */
function isEmptyTextblock(node: QuireLayoutNode): boolean {
  return node.kind === "block"
    && node.range.to - node.range.from === 2
    && (node.textFragments?.length ?? 0) === 0;
}

/**
 * Clamps a point just inside a rectangle on axes with visible extent.
 *
 * @param point - Requested document-space point.
 * @param rect - Chosen editable node rectangle.
 * @returns Interior point suitable for retained nearest-caret lookup.
 */
function clampPointToRectInterior(
  point: QuirePoint,
  rect: QuireRect
): QuirePoint {
  return {
    x: clampAxisToInterior(point.x, rect.x, rect.width),
    y: clampAxisToInterior(point.y, rect.y, rect.height)
  };
}

/**
 * Clamps one coordinate into a rectangle axis with a small interior inset.
 *
 * @param value - Requested coordinate.
 * @param start - Axis start.
 * @param extent - Axis extent.
 * @returns Coordinate inside the axis when possible.
 */
function clampAxisToInterior(
  value: number,
  start: number,
  extent: number
): number {
  if (extent <= CARET_QUERY_INSET * 2) {
    return start + extent / 2;
  }
  return Math.min(
    start + extent - CARET_QUERY_INSET,
    Math.max(start + CARET_QUERY_INSET, value)
  );
}
