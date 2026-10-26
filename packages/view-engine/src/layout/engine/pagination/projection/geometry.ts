import type { QuireRect } from "@quirekit/renderer";

/**
 * Computes the bounding rectangle for a set of page-local rectangles.
 *
 * @param rects - Rectangles to union.
 * @returns Bounding rectangle, or null when no rectangles are available.
 */
export function unionQuireRects(rects: readonly QuireRect[]): QuireRect | null {
  if (rects.length === 0) {
    return null;
  }

  let minX = rects[0]!.x;
  let minY = rects[0]!.y;
  let maxX = rects[0]!.x + rects[0]!.width;
  let maxY = rects[0]!.y + rects[0]!.height;

  for (let index = 1; index < rects.length; index += 1) {
    const rect = rects[index]!;
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
