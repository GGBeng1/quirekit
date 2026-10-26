import type { SelectionPaintRect } from "./types";

/**
 * Combines browser fragments into one nonzero-fill path, avoiding darker overlaps.
 * @param rects - Text and fully selected element boxes measured by the browser.
 * @param clip - Document content bounds, excluding space reserved for controls.
 * @param origin - Native CM layer origin in viewport coordinates.
 * @returns SVG path data in native layer coordinates; hidden source contributes no area.
 */
export function selectionPath(rects: readonly SelectionPaintRect[], clip: SelectionPaintRect, origin: { left: number; top: number }): string {
  const pieces: string[] = [];
  for (const rect of rects) {
    const left = Math.max(clip.left, rect.left), right = Math.min(clip.right, rect.right);
    const top = Math.max(clip.top, rect.top), bottom = Math.min(clip.bottom, rect.bottom);
    if (![left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top) continue;
    pieces.push(`M${left - origin.left} ${top - origin.top}H${right - origin.left}V${bottom - origin.top}H${left - origin.left}Z`);
  }
  return pieces.join("");
}
