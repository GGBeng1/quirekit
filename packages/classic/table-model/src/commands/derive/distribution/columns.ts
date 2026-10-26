import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../../map";
import { cloneCellWithAttrs, cloneRowWithAttrs, cloneTableWithRows } from "../node/clone";
import { distributeNumericTotal } from "../formatting/distribute";
import { wordTableCommandFailure, wordTableCommandSuccess } from "../../types";
import type { DistributeWordTableColumnsOptions, WordTableCommandResult } from "../../types";
import type { WordTableMeasuredSizing } from "./types";
import { distributionRange, validMeasuredSizing } from "./sizing";

/**
 * Materializes current tracks and equalizes only selected columns in one atomic preset.
 * @param table - Canonical source table.
 * @param options - Inclusive logical column range.
 * @param sizing - Fresh unscaled source geometry.
 * @returns Same-topology table with persistent equal widths, or a guarded failure.
 */
export function distributeMeasuredColumns(
  table: PMNode,
  options: DistributeWordTableColumnsOptions,
  sizing: WordTableMeasuredSizing
): WordTableCommandResult<PMNode> {
  const range = distributionRange(options.from, options.to, sizing.columnWidths.length);
  if (!range || !validMeasuredSizing(table, sizing)) return wordTableCommandFailure("invalid-selection");
  // Convert only once at the canonical boundary. Stable integer remainders keep
  // the selected total intact; unselected tracks retain their measured widths.
  const widths = sizing.columnWidths.map(width => Math.round(width * 15));
  const total = widths.slice(range.from, range.to + 1).reduce((sum, width) => sum + width, 0);
  if (!Number.isSafeInteger(total) || widths.some(width => !Number.isSafeInteger(width) || width <= 0)) return wordTableCommandFailure("invalid-selection");
  const equal = distributeNumericTotal(total, range.to - range.from + 1)!;
  if (equal.some(width => width <= 0)) return wordTableCommandFailure("invalid-selection");
  widths.splice(range.from, equal.length, ...equal);
  const previousGrid = Array.isArray(table.attrs.grid) ? table.attrs.grid : [];
  const grid = widths.map((value, index) => ({ ...previousGrid[index], width: { value, unit: "dxa" } }));
  const map = createWordTableMap(table);
  const byRow = new Map<number, Map<number, number>>();
  for (const cell of map.explicitCells) {
    const values = byRow.get(cell.rowIndex) ?? new Map<number, number>();
    values.set(cell.cellIndex, widths.slice(cell.range.startColumn, cell.range.startColumn + cell.gridSpan)
      .reduce((sum, width) => sum + width, 0));
    byRow.set(cell.rowIndex, values);
  }
  // Keep tcW consistent with the fixed grid, including horizontal spans and
  // vertical continuation cells. Content, SDT and non-size formatting survive.
  const rows = table.children.map((row, rowIndex) => cloneRowWithAttrs(row, {}, row.children.map((cell, index) =>
    cloneCellWithAttrs(cell, { width: { value: byRow.get(rowIndex)!.get(index)!, unit: "dxa" } })
  )));
  const result = cloneTableWithRows(table, {
    grid, tableLayout: "fixed", width: { value: Math.round(sizing.width * 15), unit: "dxa" }
  }, rows);
  return wordTableCommandSuccess(result.eq(table) ? table : result);
}
