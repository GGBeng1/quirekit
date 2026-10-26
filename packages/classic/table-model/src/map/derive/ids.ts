import type { MutableExplicitCellRef } from "./internal";
import type { WordTableGridRange } from "../types";

/**
 * Creates a deterministic explicit cell id.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Source cell index.
 * @param range - Cell grid range.
 * @returns Runtime explicit cell id.
 */
export function createExplicitCellId(
  rowIndex: number,
  cellIndex: number,
  range: WordTableGridRange
): string {
  return `cell:r${rowIndex}:c${cellIndex}:g${range.startColumn}:${range.columnSpan}`;
}

/**
 * Creates a deterministic semantic cell id.
 *
 * @param explicitCell - Origin explicit cell.
 * @returns Runtime semantic cell id.
 */
export function createSemanticCellId(
  explicitCell: MutableExplicitCellRef
): string {
  return `semantic:r${explicitCell.rowIndex}:c${explicitCell.cellIndex}:g${explicitCell.range.startColumn}:${explicitCell.range.columnSpan}`;
}

/**
 * Creates a stable range key.
 *
 * @param range - Grid range.
 * @returns Range key.
 */
export function getRangeKey(range: WordTableGridRange): string {
  return `${range.startColumn}:${range.columnSpan}`;
}
