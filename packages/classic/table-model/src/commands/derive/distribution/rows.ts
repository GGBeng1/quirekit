import type { Node as PMNode } from "@quirekit/pm";
import { cloneRowWithAttrs, cloneTableWithRows } from "../node/clone";
import { wordTableCommandFailure, wordTableCommandSuccess } from "../../types";
import type { DistributeWordTableRowsOptions, WordTableCommandResult } from "../../types";
import type { WordTableMeasuredSizing } from "./types";
import { distributionRange, validMeasuredSizing } from "./sizing";

/**
 * Equalizes selected source rows without clipping content or enlarging unselected rows.
 * @param table - Canonical source table.
 * @param options - Inclusive source row range.
 * @param sizing - Fresh source-flow measurements, before fragmentation.
 * @returns Same-topology table with equal content-safe heights.
 */
export function distributeMeasuredRows(
  table: PMNode,
  options: DistributeWordTableRowsOptions,
  sizing: WordTableMeasuredSizing
): WordTableCommandResult<PMNode> {
  const range = distributionRange(options.from, options.to, sizing.rowHeights.length);
  if (!range || !validMeasuredSizing(table, sizing)) return wordTableCommandFailure("invalid-selection");
  const prefix = [0];
  for (const height of sizing.rowHeights) prefix.push(prefix.at(-1)! + height);
  let height = (prefix[range.to + 1]! - prefix[range.from]!) / (range.to - range.from + 1);
  // A spanning cell may cross the selection boundary. Unselected rows keep
  // their contribution; only the selected share constrains the common height.
  for (const cell of sizing.cellMinimumHeights) {
    const end = cell.startRow + cell.rowSpan;
    const startInside = Math.max(range.from, cell.startRow);
    const endInside = Math.min(range.to + 1, end);
    if (startInside >= endInside) continue;
    const outside = prefix[end]! - prefix[cell.startRow]!
      - (prefix[endInside]! - prefix[startInside]!);
    height = Math.max(height, (cell.height - outside) / (endInside - startInside));
  }
  const value = Math.ceil(height * 15 - 1e-7);
  if (!Number.isSafeInteger(value) || value <= 0) return wordTableCommandFailure("invalid-selection");
  const rows = table.children.map((row, index) => index < range.from || index > range.to ? row
    : cloneRowWithAttrs(row, { height: { value, rule: row.attrs.height?.rule === "exact" ? "exact" : "atLeast" } }));
  const result = cloneTableWithRows(table, {}, rows);
  return wordTableCommandSuccess(result.eq(table) ? table : result);
}
