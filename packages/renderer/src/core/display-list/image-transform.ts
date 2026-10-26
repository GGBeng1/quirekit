import type {
  QuireAffineTransform,
  QuireRect
} from "../geometry";
import {
  resolveQuirePointBounds,
  resolveQuireRectCorners,
  snapQuireAffineNumber,
  transformQuirePoint,
  type QuirePoint
} from "../geometry";
import type {
  QuireImageCommand,
  QuireImageTransform
} from "@quirekit/render-contract";

/**
 * Creates the center-fixed affine for one semantic image transform.
 *
 * The returned tuple is accepted directly by Canvas `transform()` and SVG
 * `matrix()`. A null result keeps default image paint on its existing fast path.
 *
 * @param rect - Destination rectangle in display-list coordinates.
 * @param transform - Optional semantic rotation and reflection.
 * @returns Center-fixed affine, or null for the identity transform.
 */
export function createQuireImageTransformMatrix(
  rect: QuireRect,
  transform: QuireImageTransform | undefined
): QuireAffineTransform | null {
  if (transform === undefined || isIdentityTransform(transform)) {
    return null;
  }
  if (!Number.isFinite(transform.rotation)) {
    throw new Error("Image transform rotation must be finite.");
  }

  const rotationRadians = (transform.rotation % 360) * Math.PI / 180;
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  const scaleX = transform.flipHorizontal ? -1 : 1;
  const scaleY = transform.flipVertical ? -1 : 1;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const a = snapQuireAffineNumber(cosine * scaleX);
  const b = snapQuireAffineNumber(sine * scaleX);
  const c = snapQuireAffineNumber(-sine * scaleY);
  const d = snapQuireAffineNumber(cosine * scaleY);

  return {
    a,
    b,
    c,
    d,
    e: snapQuireAffineNumber(centerX - a * centerX - c * centerY),
    f: snapQuireAffineNumber(centerY - b * centerX - d * centerY)
  };
}

/**
 * Resolves destination corners after semantic image transformation.
 *
 * Corners remain ordered top-left, top-right, bottom-right, bottom-left in the
 * untransformed destination so placeholder paths preserve image orientation.
 *
 * @param rect - Destination rectangle in display-list coordinates.
 * @param transform - Optional semantic rotation and reflection.
 * @returns Four transformed destination corners.
 */
export function resolveQuireImageTransformCorners(
  rect: QuireRect,
  transform: QuireImageTransform | undefined
): readonly [QuirePoint, QuirePoint, QuirePoint, QuirePoint] {
  const corners = resolveQuireRectCorners(rect);
  const matrix = createQuireImageTransformMatrix(rect, transform);

  if (matrix === null) {
    return corners;
  }
  return [
    transformQuirePoint(corners[0], matrix),
    transformQuirePoint(corners[1], matrix),
    transformQuirePoint(corners[2], matrix),
    transformQuirePoint(corners[3], matrix)
  ];
}

/**
 * Reads the exact four-corner destination paint bounds for one image command.
 *
 * @param command - Image command whose transformed paint bounds are required.
 * @returns Axis-aligned rectangle containing every transformed destination corner.
 */
export function resolveQuireImagePaintBounds(
  command: QuireImageCommand
): QuireRect {
  const matrix = createQuireImageTransformMatrix(command.rect, command.transform);
  if (matrix === null) {
    return command.rect;
  }

  const corners = resolveQuireImageTransformCorners(command.rect, command.transform);
  return resolveQuirePointBounds(corners);
}

/**
 * Reports whether a semantic image transform has no visual effect.
 *
 * @param transform - Transform to inspect.
 * @returns Whether rotation and both reflections are identity operations.
 */
function isIdentityTransform(transform: QuireImageTransform): boolean {
  if (!Number.isFinite(transform.rotation)) {
    return false;
  }
  return transform.rotation % 360 === 0
    && !transform.flipHorizontal
    && !transform.flipVertical;
}
