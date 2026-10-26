import type { QuireRect } from "@quirekit/renderer";

const svgMeasurementRectTolerance = 0.5;

/**
 * Checks whether a measured text command belongs to a retained visual band.
 *
 * @param first - First rectangle to compare.
 * @param second - Second rectangle to compare.
 * @returns Whether the rectangles overlap within the SVG measurement tolerance.
 */
export function doRectsOverlap(
  first: QuireRect,
  second: QuireRect
): boolean {
  return (
    first.x <= second.x + second.width + svgMeasurementRectTolerance &&
    second.x <= first.x + first.width + svgMeasurementRectTolerance &&
    first.y <= second.y + second.height + svgMeasurementRectTolerance &&
    second.y <= first.y + first.height + svgMeasurementRectTolerance
  );
}

/**
 * Checks whether two rectangles belong to the same visual line band.
 *
 * @param first - First rectangle to compare.
 * @param second - Second rectangle to compare.
 * @returns Whether their vertical bands overlap within tolerance.
 */
export function doVerticalBandsOverlap(
  first: QuireRect,
  second: QuireRect
): boolean {
  return (
    first.y <= second.y + second.height + svgMeasurementRectTolerance &&
    second.y <= first.y + first.height + svgMeasurementRectTolerance
  );
}
