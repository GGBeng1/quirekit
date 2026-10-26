import {
  resolveQuireRectCorners,
  transformQuirePoint
} from "./affine";
import { containsQuirePoint } from "./rect";
import type {
  QuireAffineTransform,
  QuireHitArea,
  QuirePoint,
  QuirePolygonHitArea,
  QuireRect
} from "@quirekit/render-contract";

/** Floating tolerance used only for inclusive polygon boundaries. */
const polygonBoundaryTolerance = 1e-9;

/**
 * Creates a validated polygon hit area.
 *
 * @param points - Polygon vertices in boundary order.
 * @returns Exact polygon hit area.
 */
export function createQuirePolygonHitArea(
  points: readonly QuirePoint[]
): QuirePolygonHitArea {
  if (points.length < 3 || points.some((point) =>
    !Number.isFinite(point.x) || !Number.isFinite(point.y)
  )) {
    throw new RangeError("Polygon hit areas require at least three finite points.");
  }
  return { kind: "polygon", points };
}

/**
 * Creates an exact transformed-rectangle hit area.
 *
 * @param rect - Authored rectangle.
 * @param transform - Affine transform applied around the rectangle.
 * @returns Four-corner exact hit area.
 */
export function createQuireTransformedRectHitArea(
  rect: QuireRect,
  transform: QuireAffineTransform
): QuirePolygonHitArea {
  return createQuirePolygonHitArea(
    resolveQuireRectCorners(rect).map((point) =>
      transformQuirePoint(point, transform)
    )
  );
}

/**
 * Checks a coarse target rectangle and its optional exact geometry.
 *
 * @param rect - Coarse target bounds used by spatial indexes.
 * @param hitArea - Optional exact retained geometry.
 * @param point - Point to test.
 * @returns Whether both coarse and exact predicates accept the point.
 */
export function containsQuireTargetPoint(
  rect: QuireRect,
  hitArea: QuireHitArea | undefined,
  point: QuirePoint
): boolean {
  return containsQuirePoint(rect, point)
    && (hitArea === undefined || containsQuireHitAreaPoint(hitArea, point));
}

/**
 * Checks whether a point is inside or on an exact hit-area boundary.
 *
 * @param hitArea - Exact hit geometry.
 * @param point - Point to test.
 * @returns Whether the exact geometry accepts the point.
 */
export function containsQuireHitAreaPoint(
  hitArea: QuireHitArea,
  point: QuirePoint
): boolean {
  switch (hitArea.kind) {
    case "polygon":
      return containsPolygonPoint(hitArea.points, point);
  }
}

/**
 * Transforms every point of an exact hit area.
 *
 * @param hitArea - Exact hit geometry.
 * @param transform - Affine transform to apply.
 * @returns Transformed exact hit geometry.
 */
export function transformQuireHitArea(
  hitArea: QuireHitArea,
  transform: QuireAffineTransform
): QuireHitArea {
  switch (hitArea.kind) {
    case "polygon":
      return createQuirePolygonHitArea(
        hitArea.points.map((point) => transformQuirePoint(point, transform))
      );
  }
}

/**
 * Translates exact hit geometry without changing vertex order.
 *
 * @param hitArea - Exact hit geometry.
 * @param dx - Horizontal translation.
 * @param dy - Vertical translation.
 * @returns Translated exact hit geometry.
 */
export function translateQuireHitArea(
  hitArea: QuireHitArea,
  dx: number,
  dy: number
): QuireHitArea {
  if (dx === 0 && dy === 0) return hitArea;
  return createQuirePolygonHitArea(hitArea.points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy
  })));
}

/**
 * Applies boundary-inclusive ray casting to one polygon.
 *
 * @param polygon - Vertices in boundary order.
 * @param point - Point to test.
 * @returns Whether the polygon contains the point.
 */
function containsPolygonPoint(
  polygon: readonly QuirePoint[],
  point: QuirePoint
): boolean {
  let inside = false;
  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex]!;
    const previous = polygon[previousIndex]!;
    if (isPointOnSegment(point, previous, current)) return true;

    const crosses = (current.y > point.y) !== (previous.y > point.y)
      && point.x < (
        (previous.x - current.x) * (point.y - current.y)
        / (previous.y - current.y)
        + current.x
      );
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Checks whether a point lies on one finite segment.
 *
 * @param point - Candidate boundary point.
 * @param start - Segment start.
 * @param end - Segment end.
 * @returns Whether the point lies on the segment within floating tolerance.
 */
function isPointOnSegment(
  point: QuirePoint,
  start: QuirePoint,
  end: QuirePoint
): boolean {
  const cross = (point.y - start.y) * (end.x - start.x)
    - (point.x - start.x) * (end.y - start.y);
  if (Math.abs(cross) > polygonBoundaryTolerance) return false;

  const dot = (point.x - start.x) * (end.x - start.x)
    + (point.y - start.y) * (end.y - start.y);
  if (dot < -polygonBoundaryTolerance) return false;
  const squaredLength = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  return dot <= squaredLength + polygonBoundaryTolerance;
}
