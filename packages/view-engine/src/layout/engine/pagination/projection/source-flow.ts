import { intersectQuireRects, type QuireRect } from "@quirekit/renderer";
import type { QuirePageBodyProjection } from "./types";

/** A vertical band in source-flow coordinates accepted by a page or parent clip. */
export interface QuireSourceFlowClip {
  /** Inclusive top y coordinate in source-flow space. */
  readonly top: number;
  /** Exclusive bottom y coordinate in source-flow space. */
  readonly bottom: number;
}

/** Page fragment shape that carries a complete measured source-flow band. */
type QuireMeasuredSourceFlowPage = Pick<
  QuirePageBodyProjection["page"],
  "sourceFlowY" | "sourceFlowHeight"
> & {
  /** Source-flow y coordinate aligned to the page body. */
  readonly sourceFlowY: number;
  /** Source-flow height consumed by the page body. */
  readonly sourceFlowHeight: number;
};

/**
 * Checks whether a page fragment carries a complete measured source-flow band.
 *
 * @param page - Page fragment or partial page-like object to inspect.
 * @returns Whether the page exposes both measured source-flow coordinates.
 */
export function hasQuirePageMeasuredSourceFlowBand(
  page: Pick<QuirePageBodyProjection["page"], "sourceFlowY" | "sourceFlowHeight">
): page is QuireMeasuredSourceFlowPage {
  return page.sourceFlowY !== undefined && page.sourceFlowHeight !== undefined;
}

/**
 * Checks whether a page-body projection carries measured source-flow ownership.
 *
 * @param projection - Page-body projection to inspect.
 * @returns Whether the projection has a complete measured source-flow band.
 */
export function hasQuireMeasuredSourceFlowClip(
  projection: QuirePageBodyProjection
): boolean {
  return hasQuirePageMeasuredSourceFlowBand(projection.page);
}

/**
 * Creates the source-flow vertical band represented by one page fragment.
 *
 * Measured source-flow bands are authoritative for page projection. Callers that
 * need a page-local visual window should explicitly use
 * `createQuireProjectionVisualFlowClip` instead.
 *
 * @param projection - Page-body projection to inspect.
 * @returns Source-flow vertical clip for the projection.
 */
export function createQuireProjectionSourceFlowClip(
  projection: QuirePageBodyProjection
): QuireSourceFlowClip {
  if (hasQuirePageMeasuredSourceFlowBand(projection.page)) {
    return {
      top: projection.page.sourceFlowY,
      bottom: projection.page.sourceFlowY + projection.page.sourceFlowHeight
    };
  }

  throw new Error(
    "Page projection requires both sourceFlowY and sourceFlowHeight."
  );
}

/**
 * Creates the flow-space band represented by the page-local visual rectangle.
 *
 * @param projection - Page-body projection to inspect.
 * @returns Flow-space visual clip for the projected page rectangle.
 */
export function createQuireProjectionVisualFlowClip(
  projection: QuirePageBodyProjection
): QuireSourceFlowClip {
  return {
    top: projection.page.rect.y - projection.dy,
    bottom: projection.page.rect.y + projection.page.rect.height - projection.dy
  };
}

/**
 * Converts a projected rectangle back into source flow-space coordinates.
 *
 * @param rect - Projected rectangle.
 * @param projection - Projection that produced the rectangle.
 * @returns Flow-space rectangle matching the projected rectangle.
 */
export function createQuireFlowRectFromProjectedRect(
  rect: QuireRect,
  projection: QuirePageBodyProjection
): QuireRect {
  return {
    x: rect.x - projection.dx,
    y: rect.y - projection.dy,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Clips a source flow-space rectangle to a vertical source-flow band.
 *
 * @param rect - Source rectangle in flow coordinates.
 * @param flowClip - Source-flow vertical clipping band.
 * @returns Clipped rectangle, or null when there is no vertical intersection.
 */
export function clipQuireRectToSourceFlowClip(
  rect: QuireRect,
  flowClip: QuireSourceFlowClip
): QuireRect | null {
  const y = Math.max(rect.y, flowClip.top);
  const bottom = Math.min(rect.y + rect.height, flowClip.bottom);

  if (bottom <= y) {
    return null;
  }

  return {
    ...rect,
    y,
    height: bottom - y
  };
}

/**
 * Clips a source flow-space rectangle to a vertical band and optional parent rect.
 *
 * @param rect - Source rectangle in flow coordinates.
 * @param flowClip - Source-flow vertical clipping band.
 * @param rectClip - Optional parent visible rectangle in flow coordinates.
 * @returns Clipped rectangle, or null when there is no intersection.
 */
export function clipQuireRectToSourceFlowRect(
  rect: QuireRect,
  flowClip: QuireSourceFlowClip,
  rectClip?: QuireRect | undefined
): QuireRect | null {
  const vertical = clipQuireRectToSourceFlowClip(rect, flowClip);

  if (vertical === null || rectClip === undefined) {
    return vertical;
  }

  return intersectQuireRects(vertical, rectClip);
}

/**
 * Intersects two source-flow vertical clipping bands.
 *
 * @param first - First source-flow clip.
 * @param second - Second source-flow clip, or null when no clip is available.
 * @returns Intersected source-flow clip, or null when the clips do not overlap.
 */
export function intersectQuireSourceFlowClips(
  first: QuireSourceFlowClip,
  second: QuireSourceFlowClip | null
): QuireSourceFlowClip | null {
  if (second === null) {
    return null;
  }

  const top = Math.max(first.top, second.top);
  const bottom = Math.min(first.bottom, second.bottom);

  return bottom <= top ? null : { top, bottom };
}
