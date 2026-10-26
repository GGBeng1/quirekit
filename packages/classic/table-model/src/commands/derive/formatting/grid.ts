import type { WordTableGridColumn, WordTableWidth } from "../../../types";
import { distributeNumericTotal } from "./distribute";

/**
 * Sets one declared grid column width.
 *
 * @param grid - Source table grid attr.
 * @param tableWidth - Current table width.
 * @param columnIndex - Target grid column index.
 * @param width - Width to write.
 * @returns Updated grid column attrs.
 */
export function setGridColumnWidth(
  grid: unknown,
  tableWidth: number,
  columnIndex: number,
  width: WordTableWidth | null
): readonly WordTableGridColumn[] {
  const columns = createGridColumns(grid, tableWidth);
  const current = columns[columnIndex];

  columns[columnIndex] = {
    ...current,
    width,
  };

  return columns;
}

/**
 * Distributes grid column widths over a column range.
 *
 * @param grid - Source table grid attr.
 * @param tableWidth - Current table width.
 * @param from - First grid column index to update.
 * @param to - Last grid column index to update, inclusive.
 * @param totalWidth - Optional explicit total width for the range.
 * @returns Updated grid column attrs, or null when the range cannot be distributed.
 */
export function distributeGridColumnWidths(
  grid: unknown,
  tableWidth: number,
  from: number,
  to: number,
  totalWidth?: WordTableWidth
): readonly WordTableGridColumn[] | null {
  const columns = createGridColumns(grid, tableWidth);
  const count = to - from + 1;
  const resolvedTotalWidth = totalWidth ?? resolveCurrentTotalWidth(columns, from, to);

  if (!resolvedTotalWidth || resolvedTotalWidth.value === null) {
    return null;
  }

  const values = distributeNumericTotal(resolvedTotalWidth.value, count);

  if (!values) {
    return null;
  }

  values.forEach((value, index) => {
    const columnIndex = from + index;
    const current = columns[columnIndex];

    columns[columnIndex] = {
      ...current,
      width: createDistributedWidth(resolvedTotalWidth, value),
    };
  });

  return columns;
}

/**
 * Creates mutable grid column attrs with at least the requested width.
 *
 * @param grid - Source table grid attr.
 * @param width - Current table width.
 * @returns Mutable grid column attrs.
 */
function createGridColumns(
  grid: unknown,
  width: number
): WordTableGridColumn[] {
  const columns = Array.isArray(grid)
    ? grid.map((column) => normalizeGridColumn(column))
    : [];

  while (columns.length < width) {
    columns.push({ width: null });
  }

  return columns;
}

/**
 * Normalizes one unknown grid column attr to a mutable object.
 *
 * @param column - Source grid column attr.
 * @returns Mutable grid column attr.
 */
function normalizeGridColumn(column: unknown): WordTableGridColumn {
  if (!isRecord(column)) {
    return { width: null };
  }

  return {
    ...column,
    width: column.width as WordTableGridColumn["width"] ?? null,
  };
}

/**
 * Resolves a total width from the current grid range.
 *
 * @param columns - Normalized grid columns.
 * @param from - First grid column index to read.
 * @param to - Last grid column index to read, inclusive.
 * @returns Total width, or null when widths cannot be safely combined.
 */
function resolveCurrentTotalWidth(
  columns: readonly WordTableGridColumn[],
  from: number,
  to: number
): WordTableWidth | null {
  const firstWidth = columns[from]?.width;

  if (!firstWidth || firstWidth.value === null) {
    return null;
  }

  let total = firstWidth.value;

  for (let columnIndex = from + 1; columnIndex <= to; columnIndex += 1) {
    const width = columns[columnIndex]?.width;

    if (!width || width.value === null || width.unit !== firstWidth.unit) {
      return null;
    }

    total += width.value;
  }

  return createDistributedWidth(firstWidth, total);
}

/**
 * Creates a width value without stale raw source text.
 *
 * @param width - Width template to copy.
 * @param value - New numeric width value.
 * @returns Width value for a distributed column.
 */
function createDistributedWidth(
  width: WordTableWidth,
  value: number
): WordTableWidth {
  return {
    value,
    unit: width.unit,
  };
}

/**
 * Checks whether a value is a plain object record.
 *
 * @param value - Value to inspect.
 * @returns Whether the value can be object-spread safely.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
