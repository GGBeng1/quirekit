import type { WordTableGridRect } from "../map";

/**
 * Compares two Word table grid rects.
 *
 * @param left - First rect.
 * @param right - Second rect.
 * @returns True when the rect coordinates match.
 */
export function rectsEqual(
  left: WordTableGridRect,
  right: WordTableGridRect
): boolean {
  return left.startRow === right.startRow &&
    left.rowSpan === right.rowSpan &&
    left.startColumn === right.startColumn &&
    left.columnSpan === right.columnSpan;
}
