import type { QuireRect } from "@quirekit/renderer";

/**
 * Checks whether a retained input anchor belongs to the current visible line.
 *
 * @param anchorRect - Retained input anchor rectangle.
 * @param referenceRect - Visible position rectangle used for disambiguation.
 * @returns Whether the retained anchor is vertically aligned with the reference line.
 */
export function isMountedInputProxyAnchorOnVisibleLine(
  anchorRect: QuireRect,
  referenceRect: QuireRect | undefined
): boolean {
  if (referenceRect === undefined) {
    return true;
  }

  const maxLineHeight = Math.max(anchorRect.height, referenceRect.height, 1);

  return (
    measureMountedInputProxyVerticalCenterDistance(
      anchorRect,
      referenceRect
    ) <= maxLineHeight / 2
  );
}

/**
 * Measures vertical distance between two rectangle centers.
 *
 * @param first - First rectangle.
 * @param second - Second rectangle.
 * @returns Absolute vertical center distance.
 */
function measureMountedInputProxyVerticalCenterDistance(
  first: QuireRect,
  second: QuireRect
): number {
  return Math.abs(
    readMountedInputProxyVerticalCenter(first)
      - readMountedInputProxyVerticalCenter(second)
  );
}

/**
 * Reads the vertical center coordinate of a rectangle.
 *
 * @param rect - Rectangle to inspect.
 * @returns Vertical center coordinate.
 */
function readMountedInputProxyVerticalCenter(rect: QuireRect): number {
  return rect.y + rect.height / 2;
}
