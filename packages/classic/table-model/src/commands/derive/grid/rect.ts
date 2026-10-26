import {
  getRangeEndColumn,
  getRectEndRow,
  type WordTableGridRect,
  type WordTableMap,
} from "../../../map";
import type { MergeWordTableCellsOptions } from "../../types";

/**
 * Normalizes merge options to a grid rect.
 *
 * @param options - Merge options.
 * @returns Grid rect, or null for invalid dimensions.
 */
export function normalizeMergeRect(
  options: MergeWordTableCellsOptions
): WordTableGridRect | null {
  if (
    options.startRow < 0 ||
    options.startColumn < 0 ||
    options.rowSpan <= 0 ||
    options.columnSpan <= 0
  ) {
    return null;
  }

  return {
    startRow: options.startRow,
    startColumn: options.startColumn,
    rowSpan: options.rowSpan,
    columnSpan: options.columnSpan,
  };
}

/**
 * Checks whether a rect is inside the map bounds.
 *
 * @param map - Derived table map.
 * @param rect - Rect to inspect.
 * @returns Whether the rect is fully inside the map.
 */
export function isRectInsideMap(
  map: WordTableMap,
  rect: WordTableGridRect
): boolean {
  return rect.startRow >= 0 &&
    rect.startColumn >= 0 &&
    getRectEndRow(rect) <= map.height &&
    getRangeEndColumn(rect) <= map.width;
}

/**
 * Checks whether every slot in a rect is backed by a source cell.
 *
 * @param map - Derived table map.
 * @param rect - Rect to inspect.
 * @returns Whether every slot is a cell slot.
 */
export function rectContainsOnlyCells(
  map: WordTableMap,
  rect: WordTableGridRect
): boolean {
  for (let row = rect.startRow; row < getRectEndRow(rect); row += 1) {
    for (
      let column = rect.startColumn;
      column < getRangeEndColumn(rect);
      column += 1
    ) {
      if (map.slotAt(row, column)?.kind !== "cell") {
        return false;
      }
    }
  }

  return true;
}
