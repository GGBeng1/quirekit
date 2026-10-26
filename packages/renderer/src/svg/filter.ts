import {
  readQuireDisplayCommandPaintBounds,
  type QuireDisplayCommand,
  type QuireDisplayList
} from "../core/display-list";
import { doQuireRectsIntersect, intersectQuireRects } from "../core/geometry";
import type { QuireRect } from "../core/geometry";
import type { QuireLayoutDomOverlay } from "../core/overlay";

/**
 * Filters display commands to an optional SVG viewport.
 *
 * @param displayList - Display list to filter.
 * @param viewportRect - Optional viewport rectangle.
 * @returns Display list containing only commands that intersect the viewport.
 */
export function filterSvgSvgDisplayList(
  displayList: QuireDisplayList,
  viewportRect: QuireRect | undefined
): QuireDisplayList {
  if (viewportRect === undefined) {
    return displayList;
  }

  return {
    bounds: displayList.bounds,
    commands: displayList.commands.filter((command) =>
      doesSvgCommandIntersectRect(command, viewportRect)
    )
  };
}

/**
 * Filters DOM overlays to an optional SVG viewport.
 *
 * @param overlays - DOM overlays to filter.
 * @param viewportRect - Optional viewport rectangle.
 * @returns Overlays that intersect the viewport.
 */
export function filterSvgSvgDomOverlays(
  overlays: readonly QuireLayoutDomOverlay[],
  viewportRect: QuireRect | undefined
): readonly QuireLayoutDomOverlay[] {
  if (viewportRect === undefined) {
    return overlays;
  }

  return overlays.filter((overlay) => intersectQuireRects(overlay.rect, viewportRect));
}

/**
 * Checks whether a display command intersects a viewport rectangle.
 *
 * @param command - Display command to test.
 * @param rect - Viewport rectangle.
 * @returns Whether the command should remain in the SVG output.
 */
function doesSvgCommandIntersectRect(
  command: QuireDisplayCommand,
  rect: QuireRect
): boolean {
  const paintBounds = readQuireDisplayCommandPaintBounds(command);
  return paintBounds === null || doQuireRectsIntersect(paintBounds, rect);
}
