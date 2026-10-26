import { isQuireRectEmpty } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";

/**
 * Merges overlapping or adjacent invalidation viewport rectangles.
 *
 * @param rects - Viewport rectangles to normalize.
 * @returns Sorted, non-overlapping viewport rectangles.
 */
export function mergeQuireInvalidationViewportRects(
  rects: readonly QuireRect[]
): readonly QuireRect[] {
  const sortedRects = [...rects]
    .filter((rect) => !isQuireRectEmpty(rect))
    .sort((first, second) => first.y - second.y || first.x - second.x);
  const mergedRects: QuireRect[] = [];

  for (const rect of sortedRects) {
    addMergedRect(mergedRects, rect);
  }

  return mergedRects.sort((first, second) => first.y - second.y || first.x - second.x);
}

/**
 * Adds a rectangle to a merged rectangle list.
 *
 * @param mergedRects - Mutable list of already merged rectangles.
 * @param rect - Rectangle to add.
 */
function addMergedRect(mergedRects: QuireRect[], rect: QuireRect): void {
  let nextRect = rect;
  let merged = true;

  while (merged) {
    merged = false;

    for (let index = 0; index < mergedRects.length; index += 1) {
      const existingRect = mergedRects[index]!;

      if (!doQuireRectsTouchOrOverlap(existingRect, nextRect)) {
        continue;
      }

      nextRect = unionQuireRects(existingRect, nextRect);
      mergedRects.splice(index, 1);
      merged = true;
      break;
    }
  }

  mergedRects.push(nextRect);
}

/**
 * Checks whether two rectangles overlap or touch at an edge.
 *
 * @param first - First rectangle to compare.
 * @param second - Second rectangle to compare.
 * @returns Whether the rectangles should be merged for invalidation.
 */
function doQuireRectsTouchOrOverlap(first: QuireRect, second: QuireRect): boolean {
  return (
    first.x <= second.x + second.width &&
    second.x <= first.x + first.width &&
    first.y <= second.y + second.height &&
    second.y <= first.y + first.height
  );
}

/**
 * Computes the bounding rectangle that contains two rectangles.
 *
 * @param first - First rectangle to include.
 * @param second - Second rectangle to include.
 * @returns Rectangle containing both inputs.
 */
function unionQuireRects(first: QuireRect, second: QuireRect): QuireRect {
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}
