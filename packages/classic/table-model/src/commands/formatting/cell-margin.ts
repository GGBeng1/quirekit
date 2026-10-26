import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap, type WordTableGridRect } from "../../map";
import { isRectInsideMap, rectContainsOnlyCells } from "../derive/grid/rect";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import { prepareWordTableCommand } from "../repair";
import type {
  SetWordTableCellMarginOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";
import type { WordTableCellMargins } from "../../types";

const emptyMargins: WordTableCellMargins = {
  top: null,
  right: null,
  bottom: null,
  left: null
};

/**
 * Updates one margin side while preserving every covered cell's peer margins.
 *
 * @param tableNode - Source table node.
 * @param options - Exact semantic rectangle, side, value, and repair policy.
 * @returns Command result containing the updated table node.
 */
export function setWordTableCellMargin(
  tableNode: PMNode,
  options: SetWordTableCellMarginOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const requested = readRect(options);
  if (requested === null || !isRectInsideMap(map, requested)) {
    return wordTableCommandFailure("invalid-selection");
  }
  const rect = map.expandRectToMergedCells(requested);
  if (!isRectInsideMap(map, rect) || !rectContainsOnlyCells(map, rect)) {
    return wordTableCommandFailure("invalid-selection");
  }
  const explicitById = new Map(
    map.explicitCells.map(cell => [cell.id, cell] as const)
  );
  const targetKeys = new Set<string>();
  for (const semanticCell of map.cellsInRect(rect)) {
    for (const id of [
      semanticCell.originExplicitCellId,
      ...semanticCell.continuationExplicitCellIds
    ]) {
      const explicit = explicitById.get(id);
      if (explicit !== undefined) {
        targetKeys.add(`${explicit.rowIndex}:${explicit.cellIndex}`);
      }
    }
  }
  const rows = sourceTable.children.map((row, rowIndex) => {
    const cells = row.children.map((cell, cellIndex) => {
      if (!targetKeys.has(`${rowIndex}:${cellIndex}`)) return cell;
      const current = isMargins(cell.attrs.cellMargins)
        ? cell.attrs.cellMargins
        : emptyMargins;
      return cloneCellWithAttrs(cell, {
        cellMargins: { ...current, [options.side]: options.margin }
      });
    });
    return cloneRowWithAttrs(row, {}, cells);
  });
  return wordTableCommandSuccess(
    cloneTableWithRows(sourceTable, {}, rows),
    prepared.value.repair
  );
}

/** @param options - Candidate rectangle options. @returns Normalized rect. */
function readRect(
  options: SetWordTableCellMarginOptions
): WordTableGridRect | null {
  return Number.isInteger(options.startRow)
    && Number.isInteger(options.startColumn)
    && Number.isInteger(options.rowSpan)
    && Number.isInteger(options.columnSpan)
    && options.startRow >= 0
    && options.startColumn >= 0
    && options.rowSpan > 0
    && options.columnSpan > 0
    ? {
        startRow: options.startRow,
        startColumn: options.startColumn,
        rowSpan: options.rowSpan,
        columnSpan: options.columnSpan
      }
    : null;
}

/** @param value - Candidate margin record. @returns Whether it is usable. */
function isMargins(value: unknown): value is WordTableCellMargins {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
