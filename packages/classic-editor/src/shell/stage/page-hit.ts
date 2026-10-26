import { containsQuirePoint, type QuirePoint, type QuireRect } from "@quirekit/renderer";
import type { ClassicEditorStagePage } from "./types";

/**
 * Checks paper membership without treating page gaps as nearby document content.
 * @param pages - Non-overlapping public sheet rectangles ordered vertically.
 * @param point - Pointer in unscaled document CSS pixels.
 * @returns Whether an actual sheet contains the point, including its margins.
 */
export function containsClassicEditorPagePoint(
  pages: readonly ClassicEditorStagePage[],
  point: QuirePoint
): boolean {
  const rect = findPageRectAtY(pages, point.y);
  return rect !== undefined && containsQuirePoint(rect, point);
}

/**
 * Projects a retained sheet even when its painted DOM is outside the mounted window.
 * @param pages - Complete vertically ordered sheet table.
 * @param bounds - Canonical document bounds.
 * @param mount - Live reading-scale and scroll origin.
 * @param clientY - Client ordinate of the selected caret, including offscreen carets.
 * @returns Physical sheet in client CSS pixels, or undefined outside known paper.
 */
export function readClassicEditorPageRect(
  pages: readonly ClassicEditorStagePage[] | undefined,
  bounds: QuireRect | undefined,
  mount: HTMLElement,
  clientY: number
): QuireRect | undefined {
  if (!bounds || !pages || !Number.isFinite(clientY)) return undefined;
  const host = mount.getBoundingClientRect();
  const scale = host.width / (bounds.x + bounds.width);
  if (!(scale > 0)) return undefined;
  const rect = findPageRectAtY(pages, (clientY - host.top) / scale);
  return rect && { x: host.left + rect.x * scale, y: host.top + rect.y * scale,
    width: rect.width * scale, height: rect.height * scale };
}

/**
 * Resolves a sheet without scanning the full page stack or realizing its contents.
 * @param pages - Complete vertically ordered sheet table.
 * @param y - Ordinate in unscaled document CSS pixels.
 * @returns Containing sheet, or undefined in gaps and outside paper.
 */
function findPageRectAtY(pages: readonly ClassicEditorStagePage[], y: number): QuireRect | undefined {
  let low = 0;
  let high = pages.length;
  // Narrow by the sheet's bottom edge, then reject the gap before that sheet.
  // Using the nearest center would misclassify mixed-height page boundaries.
  while (low < high) {
    const middle = (low + high) >>> 1;
    const rect = pages[middle]!.pageRect;
    if (rect.y + rect.height < y) low = middle + 1;
    else high = middle;
  }
  const rect = pages[low]?.pageRect;
  return rect !== undefined && y >= rect.y ? rect : undefined;
}
