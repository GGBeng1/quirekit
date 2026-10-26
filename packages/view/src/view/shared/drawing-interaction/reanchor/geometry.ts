import type { DrawingAnchor } from "@quirekit/drawing-geometry";
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

/**
 * Reads the leading corner of a drawing rectangle.
 *
 * @param rect - Drawing rectangle.
 * @returns Leading corner in document space.
 */
export function leadingCorner(rect: QuireRect): QuirePoint {
  return { x: rect.x, y: rect.y };
}

/**
 * Finds the page rectangle nearest to a document point.
 *
 * @param pages - Realized page geometry.
 * @param point - Requested document-space point.
 * @returns Nearest realized page, or undefined without page geometry.
 */
export function findNearestPage(
  pages: readonly QuireLayoutPage[],
  point: QuirePoint
): QuireLayoutPage | undefined {
  let nearest: QuireLayoutPage | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const page of pages) {
    const distance = measureQuireRectDistanceSquaredToPoint(page.pageRect, point);
    if (distance < nearestDistance) {
      nearest = page;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Clamps a leading corner into a body rectangle.
 *
 * @param point - Requested leading corner.
 * @param rect - Target body rectangle.
 * @returns Point accepted by body caret geometry.
 */
export function clampPointToRect(
  point: QuirePoint,
  rect: QuireRect
): QuirePoint {
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height)
  };
}

/**
 * Finds the page-projected block rectangle for one source textblock.
 *
 * @param node - Current layout subtree.
 * @param paragraphStart - ProseMirror position before the target textblock.
 * @param pageRect - Target page used to disambiguate repeated projections.
 * @returns Smallest matching projected block rectangle.
 */
export function findProjectedTextblockRect(
  node: QuireLayoutNode,
  paragraphStart: number,
  pageRect: QuireRect
): QuireRect | undefined {
  let result: QuireRect | undefined;
  if (
    node.kind === "block"
    && node.range.from === paragraphStart
    && doQuireRectsIntersect(node.rect, pageRect)
  ) {
    result = node.rect;
  }
  for (const child of node.children ?? []) {
    const candidate = findProjectedTextblockRect(child, paragraphStart, pageRect);
    if (
      candidate !== undefined
      && (result === undefined || area(candidate) < area(result))
    ) {
      result = candidate;
    }
  }
  return result;
}

/**
 * Resolves the horizontal placement reference on the target page.
 *
 * @param attrs - Offset placement source intent.
 * @param caretRect - Exact target caret geometry.
 * @param page - Target page geometry.
 * @returns Reference rectangle whose x origin rebases the move.
 */
export function resolveInlineReferenceRect(
  attrs: DrawingAnchor,
  caretRect: QuireRect,
  page: QuireLayoutPage
): QuireRect {
  const reference = attrs.horizontalPosition.relativeTo;
  return reference === "character"
    ? caretRect
    : reference === "page"
      ? page.pageRect
      : page.bodyRect;
}

/**
 * Resolves the vertical placement reference on the target page.
 *
 * @param attrs - Offset placement source intent.
 * @param caretRect - Exact target line/caret geometry.
 * @param paragraphRect - Projected target paragraph rectangle.
 * @param page - Target page geometry.
 * @returns Reference rectangle whose y origin rebases the move.
 */
export function resolveBlockReferenceRect(
  attrs: DrawingAnchor,
  caretRect: QuireRect,
  paragraphRect: QuireRect,
  page: QuireLayoutPage
): QuireRect {
  const reference = attrs.verticalPosition.relativeTo;
  return reference === "line"
    ? caretRect
    : reference === "paragraph"
      ? paragraphRect
      : reference === "page"
        ? page.pageRect
        : page.bodyRect;
}

/**
 * Clamps a number to inclusive bounds.
 *
 * @param value - Numeric value.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns Clamped value.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Measures rectangle area.
 *
 * @param rect - Rectangle to measure.
 * @returns Rectangle area.
 */
function area(rect: QuireRect): number {
  return rect.width * rect.height;
}
