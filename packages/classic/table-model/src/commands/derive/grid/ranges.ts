import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableRowCellRange } from "../shared/types";

/**
 * Reads the effective column span from a cell node.
 *
 * @param cell - Source cell.
 * @returns Positive column span.
 */
export function readWordTableCellSpan(cell: PMNode): number {
  const gridSpan = cell.attrs.gridSpan;
  const colspan = cell.attrs.colspan;

  if (Number.isInteger(gridSpan) && (gridSpan as number) > 0) {
    return gridSpan as number;
  }

  if (Number.isInteger(colspan) && (colspan as number) > 0) {
    return colspan as number;
  }

  return 1;
}

/**
 * Reads a row grid offset.
 *
 * @param row - Source row.
 * @param name - Offset attr name.
 * @returns Non-negative offset count.
 */
export function readWordTableRowOffset(
  row: PMNode,
  name: "gridBefore" | "gridAfter"
): number {
  const value = row.attrs[name];

  return Number.isInteger(value) && (value as number) > 0 ? value as number : 0;
}

/**
 * Resolves row cells into grid ranges.
 *
 * @param row - Source row.
 * @returns Row cells with grid ranges.
 */
export function getWordTableRowCellRanges(
  row: PMNode
): readonly WordTableRowCellRange[] {
  const ranges: WordTableRowCellRange[] = [];
  let column = readWordTableRowOffset(row, "gridBefore");

  row.forEach((cell, _offset, cellIndex) => {
    const columnSpan = readWordTableCellSpan(cell);

    ranges.push({
      cell,
      cellIndex,
      startColumn: column,
      columnSpan
    });
    column += columnSpan;
  });

  return ranges;
}

/**
 * Creates a stable key for a one-row cell range.
 *
 * @param startColumn - Start column.
 * @param columnSpan - Column span.
 * @returns Range key.
 */
export function getWordTableRangeKey(
  startColumn: number,
  columnSpan: number
): string {
  return `${startColumn}:${columnSpan}`;
}
