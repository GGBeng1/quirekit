import type { QuireClientPoint, QuireClientRect } from "@quirekit/view-engine";
import type { ProjectMountedDragClientPointOptions } from "../types";

/**
 * Projects an active drag pointer point onto the mounted coordinate surface.
 *
 * @param options - Pointer client point and coordinate surface rectangle.
 * @returns Client point clamped to the visible coordinate surface bounds.
 */
export function projectMountedDragClientPointToSurface(
  options: ProjectMountedDragClientPointOptions
): QuireClientPoint {
  const {
    clientPoint,
    dragBoundaryClientRect,
    layoutViewportClientRect,
    surfaceClientRect
  } = options;

  if (surfaceClientRect.width <= 0 || surfaceClientRect.height <= 0) {
    return clientPoint;
  }

  const surfaceBounds =
    dragBoundaryClientRect === undefined
      ? surfaceClientRect
      : intersectClientRects(surfaceClientRect, dragBoundaryClientRect) ?? surfaceClientRect;
  const horizontalBounds = layoutViewportClientRect ?? surfaceBounds;
  const verticalBase = layoutViewportClientRect ?? surfaceBounds;
  const verticalBounds =
    dragBoundaryClientRect === undefined
      ? verticalBase
      : intersectClientRectAxis(verticalBase, dragBoundaryClientRect, "vertical") ??
        verticalBase;

  return {
    clientX: clampInside(
      clientPoint.clientX,
      horizontalBounds.left,
      horizontalBounds.left + horizontalBounds.width
    ),
    clientY: clampInside(
      clientPoint.clientY,
      verticalBounds.top,
      verticalBounds.top + verticalBounds.height
    )
  };
}

/**
 * Intersects two client rectangles.
 *
 * @param first - First client rectangle.
 * @param second - Second client rectangle.
 * @returns Positive-area intersection, or null when they do not overlap.
 */
function intersectClientRects(
  first: QuireClientRect,
  second: QuireClientRect
): QuireClientRect | null {
  const left = Math.max(first.left, second.left);
  const top = Math.max(first.top, second.top);
  const right = Math.min(first.left + first.width, second.left + second.width);
  const bottom = Math.min(first.top + first.height, second.top + second.height);
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { left, top, width, height };
}

/**
 * Intersects one axis of two client rectangles while preserving the other axis.
 *
 * @param base - Rectangle that owns the non-intersected axis.
 * @param boundary - Boundary rectangle used to clip one axis.
 * @param axis - Axis to intersect.
 * @returns Rectangle with the selected axis clipped, or null when that axis does not overlap.
 */
function intersectClientRectAxis(
  base: QuireClientRect,
  boundary: QuireClientRect,
  axis: "horizontal" | "vertical"
): QuireClientRect | null {
  if (axis === "horizontal") {
    const left = Math.max(base.left, boundary.left);
    const right = Math.min(base.left + base.width, boundary.left + boundary.width);
    const width = right - left;

    if (width <= 0) {
      return null;
    }

    return { ...base, left, width };
  }

  const top = Math.max(base.top, boundary.top);
  const bottom = Math.min(base.top + base.height, boundary.top + boundary.height);
  const height = bottom - top;

  if (height <= 0) {
    return null;
  }

  return { ...base, top, height };
}

/**
 * Keeps drag hits inside the surface; its shared border may belong to outside UI.
 *
 * @param value - Number to clamp.
 * @param min - Leading client edge.
 * @param max - Trailing client edge.
 * @returns Interior coordinate, including subpixel-sized surfaces.
 */
function clampInside(value: number, min: number, max: number): number {
  const inset = Math.min(1, (max - min) / 2);
  return Math.min(max - inset, Math.max(min + inset, value));
}
