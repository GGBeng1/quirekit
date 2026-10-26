import { mergeQuireInvalidationRanges } from "./ranges";
import { mergeQuireInvalidationViewportRects } from "./rects";
import type {
  QuireInvalidationPlan,
  QuireInvalidationRange,
  QuireSelectionInvalidationOptions
} from "./types";

/**
 * Builds an invalidation plan for selection geometry changes.
 *
 * @param options - Previous and next selection geometry to compare.
 * @returns Invalidation plan covering affected document ranges and viewport rectangles.
 */
export function buildQuireSelectionInvalidationPlan(
  options: QuireSelectionInvalidationOptions
): QuireInvalidationPlan {
  const ranges: QuireInvalidationRange[] = [
    ...options.previousSelectionGeometry.ranges.map((rangeGeometry) => rangeGeometry.range),
    ...options.nextSelectionGeometry.ranges.map((rangeGeometry) => rangeGeometry.range)
  ];
  const viewportRects = [
    ...options.previousSelectionGeometry.carets.map((caretGeometry) => caretGeometry.rect),
    ...options.previousSelectionGeometry.ranges.map((rangeGeometry) => rangeGeometry.rect),
    ...options.nextSelectionGeometry.carets.map((caretGeometry) => caretGeometry.rect),
    ...options.nextSelectionGeometry.ranges.map((rangeGeometry) => rangeGeometry.rect)
  ];

  return {
    ranges: mergeQuireInvalidationRanges(ranges),
    viewportRects: mergeQuireInvalidationViewportRects(viewportRects)
  };
}
