import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import type { WordTableCommandResult } from "../types";
import { wordTableCommandSuccess } from "../types";

/**
 * Applies content-preserving repairs that do not change table semantics.
 *
 * @param tableNode - Source table node.
 * @returns Safely normalized table node.
 */
export function applySafeWordTableRepairs(tableNode: PMNode): PMNode {
  const initialMap = createWordTableMap(tableNode);
  const rows = tableNode.children.map((row, rowIndex) => {
    const rowRef = initialMap.rows[rowIndex];
    const cells = row.children.map((cell) => {
      const gridSpan = readPositiveInteger(
        cell.attrs.gridSpan,
        readPositiveInteger(cell.attrs.colspan, 1)
      );

      return cell.attrs.colspan === gridSpan && cell.attrs.gridSpan === gridSpan
        ? cell
        : cloneCellWithAttrs(cell, { colspan: gridSpan, gridSpan });
    });
    const missingCellCount = rowRef
      ? Math.max(0, rowRef.declaredGridWidth - rowRef.occupiedGridWidth)
      : 0;

    for (let index = 0; index < missingCellCount; index += 1) {
      const emptyCell = createEmptyCell(row);
      if (emptyCell) cells.push(emptyCell);
    }

    return cloneRowWithAttrs(row, {
      gridBefore: normalizeGridOffset(row.attrs.gridBefore),
      gridAfter: normalizeGridOffset(row.attrs.gridAfter)
    }, cells);
  });

  return cloneTableWithRows(tableNode, {}, rows);
}

/**
 * Synchronizes `colspan` with the effective Word `gridSpan` on every cell.
 *
 * @param tableNode - Source table node.
 * @returns Command result containing the repaired table node.
 */
export function repairWordTableGridSpanColspan(
  tableNode: PMNode
): WordTableCommandResult<PMNode> {
  const rows = tableNode.children.map((row) =>
    cloneRowWithAttrs(row, {}, row.children.map((cell) => {
      const gridSpan = readPositiveInteger(
        cell.attrs.gridSpan,
        readPositiveInteger(cell.attrs.colspan, 1)
      );
      return cloneCellWithAttrs(cell, { colspan: gridSpan, gridSpan });
    }))
  );

  return wordTableCommandSuccess(cloneTableWithRows(tableNode, {}, rows));
}

/**
 * Creates one schema-valid empty cell matching a source row.
 *
 * @param row - Source row whose cell type supplies the schema authority.
 * @returns Empty cell, or null when the schema cannot fill one.
 */
function createEmptyCell(row: PMNode): PMNode | null {
  return row.firstChild?.type.createAndFill() ?? null;
}

/**
 * Normalizes one row grid offset without inventing omitted columns.
 *
 * @param value - Source row offset.
 * @returns Non-negative integer offset.
 */
function normalizeGridOffset(value: unknown): number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0
    ? value
    : 0;
}

/**
 * Reads a positive integer with a caller-owned fallback.
 *
 * @param value - Candidate integer.
 * @param fallback - Value used for invalid input.
 * @returns Positive integer.
 */
function readPositiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && typeof value === "number" && value > 0
    ? value
    : fallback;
}
