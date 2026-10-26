import type { QuirePoint, QuireRect } from "@quirekit/render-contract";

/**
 * Checks whether a rectangle has no positive drawable area.
 *
 * @param rect - Rectangle to inspect.
 * @returns Whether the rectangle is invalid or lacks positive drawable area.
 */
export function isQuireRectEmpty(rect: QuireRect): boolean {
  return !isQuireRectFinite(rect) || rect.width === 0 || rect.height === 0;
}

/**
 * Checks whether a rectangle contains finite coordinates and non-negative extents.
 *
 * Negative extents are rejected instead of normalized because the geometry
 * owner cannot also rewrite the source command's declared bounds.
 *
 * @param rect - Rectangle to inspect.
 * @returns Whether the rectangle is finite and has non-negative dimensions.
 */
export function isQuireRectFinite(rect: QuireRect): boolean {
  return typeof rect === "object"
    && rect !== null
    && Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width >= 0
    && rect.height >= 0;
}

/**
 * Normalizes optional rectangle sets to positive-area geometry.
 *
 * The original array is retained when every rectangle is valid. An absent,
 * empty, or entirely non-positive set resolves to `undefined`, which callers
 * use to represent disabled clipping rather than an active empty clip.
 *
 * @param rects - Candidate rectangles, or undefined when no set was supplied.
 * @returns Positive-area rectangles, or undefined when none remain.
 */
export function normalizeQuirePositiveAreaRects(
  rects: readonly QuireRect[] | undefined
): readonly QuireRect[] | undefined {
  if (rects === undefined || rects.length === 0) {
    return undefined;
  }

  let normalized: QuireRect[] | undefined;
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index]!;

    if (!isQuireRectEmpty(rect)) {
      normalized?.push(rect);
      continue;
    }

    if (normalized === undefined) {
      normalized = rects.slice(0, index);
    }
  }

  if (normalized === undefined) {
    return rects;
  }

  return normalized.length === 0 ? undefined : normalized;
}

/**
 * Checks whether a point is inside a rectangle.
 *
 * @param rect - Rectangle used as the containment boundary.
 * @param point - Point to test against the rectangle.
 * @returns Whether the point falls inside or on the rectangle boundary.
 */
export function containsQuirePoint(rect: QuireRect, point: QuirePoint): boolean {
  if (
    isQuireRectEmpty(rect)
    || !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
  ) {
    return false;
  }

  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x <= rect.x + rect.width &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Computes the overlapping rectangle shared by two rectangles.
 *
 * @param first - First rectangle to intersect.
 * @param second - Second rectangle to intersect.
 * @returns The intersection rectangle, or null when the rectangles do not
 * overlap with positive area.
 */
export function intersectQuireRects(
  first: QuireRect,
  second: QuireRect
): QuireRect | null {
  if (isQuireRectEmpty(first) || isQuireRectEmpty(second)) {
    return null;
  }

  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  const rect = {
    x,
    y,
    width: right - x,
    height: bottom - y
  };

  return isQuireRectEmpty(rect) ? null : rect;
}

/**
 * Checks whether two finite rectangles overlap with positive area.
 *
 * @param first - First rectangle to inspect.
 * @param second - Second rectangle to inspect.
 * @returns Whether the rectangles share positive-area geometry.
 */
export function doQuireRectsIntersect(
  first: QuireRect,
  second: QuireRect
): boolean {
  if (isQuireRectEmpty(first) || isQuireRectEmpty(second)) {
    return false;
  }

  // Same overlap as `intersectQuireRects`, without allocating the overlap rectangle.
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const width = Math.min(first.x + first.width, second.x + second.width) - x;
  const height = Math.min(first.y + first.height, second.y + second.height) - y;
  return Number.isFinite(x)
    && Number.isFinite(y)
    && Number.isFinite(width)
    && Number.isFinite(height)
    && width > 0
    && height > 0;
}

/**
 * Checks whether a rectangle intersects any candidate with positive area.
 *
 * An absent clip set remains a caller-owned unbounded policy and is therefore
 * intentionally not accepted by this pure geometry helper.
 *
 * @param rect - Rectangle to compare.
 * @param candidates - Candidate rectangles to inspect.
 * @returns Whether at least one candidate has a positive-area intersection.
 */
export function doesQuireRectIntersectAny(
  rect: QuireRect,
  candidates: readonly QuireRect[]
): boolean {
  return candidates.some((candidate) => doQuireRectsIntersect(rect, candidate));
}

/**
 * Measures squared Euclidean distance from a point to a rectangle.
 *
 * Finite zero-area rectangles retain useful segment/point distance semantics.
 * Invalid rectangles and points return positive infinity so nearest-candidate
 * queries fail closed without adding caller-specific exception branches.
 *
 * @param rect - Rectangle whose exterior distance should be measured.
 * @param point - Point to compare in the same coordinate space.
 * @returns Squared distance, or positive infinity for invalid geometry.
 */
export function measureQuireRectDistanceSquaredToPoint(
  rect: QuireRect,
  point: QuirePoint
): number {
  if (
    !isQuireRectFinite(rect)
    || !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const dx = point.x < rect.x
    ? rect.x - point.x
    : point.x > rect.x + rect.width
      ? point.x - (rect.x + rect.width)
      : 0;
  const dy = point.y < rect.y
    ? rect.y - point.y
    : point.y > rect.y + rect.height
      ? point.y - (rect.y + rect.height)
      : 0;

  return dx * dx + dy * dy;
}
