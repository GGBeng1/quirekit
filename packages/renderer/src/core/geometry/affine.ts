import type {
  QuireAffineTransform,
  QuirePoint,
  QuireRect
} from "@quirekit/render-contract";

/** Tolerance used to remove trigonometric residue at quarter turns. */
const affineSnapTolerance = 1e-12;

/**
 * Creates a center-fixed clockwise rotation in the y-down renderer coordinate
 * system.
 *
 * @param rect - Rectangle whose center remains fixed.
 * @param rotation - Clockwise rotation in degrees.
 * @returns Finite Canvas/SVG affine coefficients.
 */
export function createQuireCenterRotationTransform(
  rect: QuireRect,
  rotation: number
): QuireAffineTransform {
  if (!Number.isFinite(rotation)) {
    throw new RangeError("Rotation must be finite.");
  }

  const radians = (rotation % 360) * Math.PI / 180;
  const cosine = snapQuireAffineNumber(Math.cos(radians));
  const sine = snapQuireAffineNumber(Math.sin(radians));
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: snapQuireAffineNumber(centerX - cosine * centerX + sine * centerY),
    f: snapQuireAffineNumber(centerY - sine * centerX - cosine * centerY)
  };
}

/**
 * Applies an affine transform to one point.
 *
 * @param point - Point in the transform input coordinate space.
 * @param transform - Canvas/SVG affine coefficients.
 * @returns Point in the transform output coordinate space.
 */
export function transformQuirePoint(
  point: QuirePoint,
  transform: QuireAffineTransform
): QuirePoint {
  return {
    x: snapQuireAffineNumber(
      transform.a * point.x + transform.c * point.y + transform.e
    ),
    y: snapQuireAffineNumber(
      transform.b * point.x + transform.d * point.y + transform.f
    )
  };
}

/**
 * Rebases an affine when its input and output geometry move by one translation.
 *
 * This is the conjugation `T(delta) * transform * T(-delta)`. It preserves the
 * visible transform around translated document-space geometry instead of
 * leaving a center-fixed rotation attached to its old coordinate origin.
 *
 * @param transform - Affine expressed in the original coordinate space.
 * @param dx - Horizontal coordinate-space translation.
 * @param dy - Vertical coordinate-space translation.
 * @returns Equivalent affine expressed in the translated coordinate space.
 */
export function translateQuireAffineTransform(
  transform: QuireAffineTransform,
  dx: number,
  dy: number
): QuireAffineTransform {
  return {
    a: transform.a,
    b: transform.b,
    c: transform.c,
    d: transform.d,
    e: snapQuireAffineNumber(
      transform.e + dx - transform.a * dx - transform.c * dy
    ),
    f: snapQuireAffineNumber(
      transform.f + dy - transform.b * dx - transform.d * dy
    )
  };
}

/**
 * Resolves rectangle corners in clockwise authored order.
 *
 * @param rect - Rectangle whose corners are required.
 * @returns Top-left, top-right, bottom-right, and bottom-left points.
 */
export function resolveQuireRectCorners(
  rect: QuireRect
): readonly [QuirePoint, QuirePoint, QuirePoint, QuirePoint] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
}

/**
 * Resolves the smallest axis-aligned rectangle containing a point set.
 *
 * @param points - Non-empty point set to contain.
 * @returns Axis-aligned point bounds.
 */
export function resolveQuirePointBounds(
  points: readonly QuirePoint[]
): QuireRect {
  const first = points[0];
  if (first === undefined) {
    throw new RangeError("Point bounds require at least one point.");
  }

  let left = first.x;
  let top = first.y;
  let right = first.x;
  let bottom = first.y;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

/**
 * Removes near-zero and near-unit residue from affine calculations.
 *
 * @param value - Calculated coefficient or coordinate.
 * @returns Stable finite number.
 */
export function snapQuireAffineNumber(value: number): number {
  if (Math.abs(value) < affineSnapTolerance) return 0;
  if (Math.abs(value - 1) < affineSnapTolerance) return 1;
  if (Math.abs(value + 1) < affineSnapTolerance) return -1;
  return value;
}
