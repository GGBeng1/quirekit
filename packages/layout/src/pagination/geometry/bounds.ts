import type { QuirePageFragment } from "../types";
import type { QuireRect } from "@quirekit/renderer";

/**
 * Resolves the document bounds implied by a generated page stack.
 *
 * @param fallbackRect - Original infinite-flow document rectangle.
 * @param pages - Generated page fragments with resolved page rectangles.
 * @returns Bounds covering every generated page, or the fallback when no pages exist.
 */
export function createQuirePaginatedDocumentRect(
  fallbackRect: QuireRect,
  pages: readonly QuirePageFragment[]
): QuireRect {
  if (pages.length === 0) {
    return fallbackRect;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const page of pages) {
    minX = Math.min(minX, page.pageRect.x);
    minY = Math.min(minY, page.pageRect.y);
    maxX = Math.max(maxX, page.pageRect.x + page.pageRect.width);
    maxY = Math.max(maxY, page.pageRect.y + page.pageRect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
