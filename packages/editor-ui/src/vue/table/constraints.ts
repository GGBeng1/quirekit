import type { EditorUITableAxis } from "./types";

/** Minimum column width exposed by drag resize, in document pixels. */
export const editorUITableMinimumColumnWidth = 24;
/** Minimum positive row frame exposed by drag resize, in document pixels. */
export const editorUITableMinimumRowHeight = 1;
/** Leading extent of table rail and insertion controls, in client CSS pixels. */
export const editorUITableChromeOutset = 22;

/**
 * Clamps one pointer delta so the resized axis item remains usable.
 *
 * @param axis - Row or column being resized.
 * @param initialSize - Axis size at pointer capture in CSS pixels.
 * @param pointerDelta - Raw pointer movement in CSS pixels.
 * @param scale - Document-to-viewport scale captured with the geometry.
 * @returns Preview delta after minimum-size clamping.
 */
export function clampEditorUITableResizeDelta(
  axis: EditorUITableAxis,
  initialSize: number,
  pointerDelta: number,
  scale = 1
): number {
  return Math.max(
    (axis === "row" ? editorUITableMinimumRowHeight : editorUITableMinimumColumnWidth) * scale - initialSize,
    pointerDelta
  );
}
