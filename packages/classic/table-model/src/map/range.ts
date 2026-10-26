import type { WordTableGridRange, WordTableGridRect } from "./types";

/**
 * Gets the exclusive end column for a grid range.
 *
 * @param range - Grid range to inspect.
 * @returns Exclusive end column.
 */
export function getRangeEndColumn(range: WordTableGridRange): number {
  return range.startColumn + range.columnSpan;
}

/**
 * Gets the exclusive end row for a grid rect.
 *
 * @param rect - Grid rect to inspect.
 * @returns Exclusive end row.
 */
export function getRectEndRow(rect: WordTableGridRect): number {
  return rect.startRow + rect.rowSpan;
}

/**
 * Reports whether two horizontal grid ranges intersect.
 *
 * @param left - First range.
 * @param right - Second range.
 * @returns True when ranges overlap by at least one column.
 */
export function rangesIntersect(
  left: WordTableGridRange,
  right: WordTableGridRange
): boolean {
  return left.startColumn < getRangeEndColumn(right) &&
    right.startColumn < getRangeEndColumn(left);
}

/**
 * Reports whether two grid rects intersect.
 *
 * @param left - First rect.
 * @param right - Second rect.
 * @returns True when rects overlap by at least one slot.
 */
export function rectsIntersect(
  left: WordTableGridRect,
  right: WordTableGridRect
): boolean {
  return left.startRow < getRectEndRow(right) &&
    right.startRow < getRectEndRow(left) &&
    rangesIntersect(left, right);
}

/**
 * Creates the smallest rect containing both input rects.
 *
 * @param left - First rect.
 * @param right - Second rect.
 * @returns Union rect.
 */
export function unionRects(
  left: WordTableGridRect,
  right: WordTableGridRect
): WordTableGridRect {
  const startRow = Math.min(left.startRow, right.startRow);
  const startColumn = Math.min(left.startColumn, right.startColumn);
  const endRow = Math.max(getRectEndRow(left), getRectEndRow(right));
  const endColumn = Math.max(getRangeEndColumn(left), getRangeEndColumn(right));

  return {
    startRow,
    startColumn,
    rowSpan: endRow - startRow,
    columnSpan: endColumn - startColumn
  };
}

/**
 * Converts a one-row range to a grid rect.
 *
 * @param rowIndex - Row that owns the range.
 * @param range - Horizontal range.
 * @returns One-row grid rect.
 */
export function rangeToRect(
  rowIndex: number,
  range: WordTableGridRange
): WordTableGridRect {
  return {
    startRow: rowIndex,
    rowSpan: 1,
    startColumn: range.startColumn,
    columnSpan: range.columnSpan
  };
}
