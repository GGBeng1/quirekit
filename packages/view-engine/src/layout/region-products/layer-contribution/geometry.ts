import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import { isQuireRectFinite } from "@quirekit/renderer";

/**
 * Reports whether one finite rectangle is fully contained by another.
 *
 * @param outer - Authoritative containing rectangle.
 * @param inner - Artifact rectangle to validate, or null for unknown bounds.
 * @returns Whether both rectangles are valid and inner is fully contained.
 */
export function containsQuireLayerContributionRect(
  outer: QuireRect,
  inner: QuireRect | null
): boolean {
  if (
    inner === null
    || !isQuireRectFinite(outer)
    || !isQuireRectFinite(inner)
  ) {
    return false;
  }

  const tolerance = resolveRectContainmentTolerance(outer, inner);
  return inner.x >= outer.x - tolerance
    && inner.y >= outer.y - tolerance
    && inner.x + inner.width <= outer.x + outer.width + tolerance
    && inner.y + inner.height <= outer.y + outer.height + tolerance;
}

/**
 * Reports whether one document range is fully contained by another.
 *
 * @param outer - Authoritative owner range.
 * @param inner - Artifact range to validate.
 * @returns Whether the artifact range stays inside its owner.
 */
export function containsQuireLayerContributionRange(
  outer: QuireDocumentRange,
  inner: QuireDocumentRange
): boolean {
  return Number.isFinite(inner.from)
    && Number.isFinite(inner.to)
    && inner.from <= inner.to
    && inner.from >= outer.from
    && inner.to <= outer.to;
}

/**
 * Resolves a scale-aware tolerance for repeated affine-bound calculations.
 *
 * @param outer - Authoritative containing rectangle.
 * @param inner - Artifact rectangle derived from the same geometry.
 * @returns Small numerical tolerance measured in document coordinates.
 */
function resolveRectContainmentTolerance(
  outer: QuireRect,
  inner: QuireRect
): number {
  const magnitude = Math.max(
    1,
    Math.abs(outer.x),
    Math.abs(outer.y),
    Math.abs(outer.x + outer.width),
    Math.abs(outer.y + outer.height),
    Math.abs(inner.x),
    Math.abs(inner.y),
    Math.abs(inner.x + inner.width),
    Math.abs(inner.y + inner.height)
  );
  return magnitude * Number.EPSILON * 16;
}
