import { ChartValidationError } from "../model/validation";
import type { ChartDataCellChange, ChartDataDraft, ChartDataIdAllocator } from "./types";
import { copyChartDataDraft, acceptChartDataDraft, readChartDataNumber } from "./value";

/** @param data - Detached source. @param changes - Exact stable-cell edits. @returns One complete raw-text replacement; incomplete numbers remain draft-only. */
export function replaceChartDataCells(data: ChartDataDraft, changes: readonly ChartDataCellChange[]): ChartDataDraft {
  const next = copyChartDataDraft(data);
  const rows = new Map(next.rows.map(row => [row.id, row]));
  const columns = new Map(next.columns.map(column => [column.id, column]));
  for (const change of changes) {
    const row = rows.get(change.rowId), column = columns.get(change.columnId);
    if (row === undefined || column === undefined) throw new ChartValidationError("data", "chart-cell-unavailable");
    assertChartDataText(change.text);
    row.values = { ...row.values, [column.id]: change.text };
  }
  return acceptChartDataDraft(next);
}

/** @param text - Raw cell input. Validates text bounds and XML-safety before accepting any batch. */
export function assertChartDataText(text: string): void {
  if (text.length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(text))
    throw new ChartValidationError("data", "chart-invalid-cell-text");
}

/**
 * Accepts a whole paste without delegating clipping or mutation to a grid library.
 * @param data - Detached source.
 * @param rowIndex - Zero-based first row.
 * @param columnIndex - Zero-based first column.
 * @param matrix - Complete rectangular paste.
 * @param allocate - Fresh identities for newly grown rows.
 * @returns Draft with the complete validated rectangle; any invalid cell rejects the batch.
 */
export function pasteChartDataMatrix(data: ChartDataDraft, rowIndex: number, columnIndex: number,
  matrix: readonly (readonly string[])[], allocate: ChartDataIdAllocator): ChartDataDraft {
  const width = matrix[0]?.length ?? 0;
  if (!Number.isSafeInteger(rowIndex) || !Number.isSafeInteger(columnIndex) || rowIndex < 0 || columnIndex < 0
    || matrix.length === 0 || width === 0 || matrix.some(row => row.length !== width)
    || rowIndex + matrix.length > 1000 || columnIndex + width > data.columns.length)
    throw new ChartValidationError("data", "chart-paste-range-ineligible");
  // Validate all cells before allocating rows or replacing the source. No valid
  // prefix may survive an invalid final cell or an out-of-bounds rectangle.
  for (const row of matrix) for (const [offset, text] of row.entries()) {
    assertChartDataText(text);
    if (data.columns[columnIndex + offset]!.type === "number") readChartDataNumber(text, "data.paste");
  }
  const next = copyChartDataDraft(data);
  while (next.rows.length < rowIndex + matrix.length)
    next.rows.push({ id: allocate("row"), values: Object.fromEntries(next.columns.map(column => [column.id, ""])) });
  for (const [offset, row] of matrix.entries()) {
    const target = next.rows[rowIndex + offset]!;
    target.values = { ...target.values, ...Object.fromEntries(row.map((text, index) => [next.columns[columnIndex + index]!.id, text])) };
  }
  return acceptChartDataDraft(next);
}
