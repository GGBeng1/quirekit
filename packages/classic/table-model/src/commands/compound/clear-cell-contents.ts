import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap, type WordTableGridRect } from "../../map";
import {
  isRectInsideMap,
  rectContainsOnlyCells
} from "../derive/grid/rect";
import {
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import { prepareWordTableCommand } from "../repair";
import type {
  ClearWordTableCellContentsOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";

/**
 * Clears selected semantic cell bodies without changing table topology or attrs.
 *
 * A partial merged-cell intersection expands to the whole semantic cell. Every
 * explicit carrier owned by that semantic cell receives one canonical empty
 * paragraph, while rows, cells, spans, margins, borders, and table attrs remain
 * unchanged.
 *
 * @param tableNode - Source table node.
 * @param options - Cell-content clearing options.
 * @returns Command result containing the updated or unchanged table node.
 */
export function clearWordTableCellContents(
  tableNode: PMNode,
  options: ClearWordTableCellContentsOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;

  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const requestedRect = normalizeRect(options);
  if (!requestedRect || !isRectInsideMap(map, requestedRect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rect = map.expandRectToMergedCells(requestedRect);
  if (!isRectInsideMap(map, rect) || !rectContainsOnlyCells(map, rect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const paragraph = sourceTable.type.schema.nodes.paragraph?.createAndFill();
  if (!paragraph) {
    return wordTableCommandFailure("invalid-content");
  }

  const targetKeys = getExplicitCellKeysForRect(map, rect);
  let changed = false;
  const rows = sourceTable.children.map((row, rowIndex) => {
    const cells = row.children.map((cell, cellIndex) => {
      if (!targetKeys.has(cellKey(rowIndex, cellIndex))) return cell;
      if (cell.childCount === 1 && cell.firstChild?.eq(paragraph)) return cell;

      changed = true;
      return cell.type.create(cell.attrs, paragraph, cell.marks);
    });

    return cells.every((cell, index) => cell === row.child(index))
      ? row
      : cloneRowWithAttrs(row, {}, cells);
  });

  return wordTableCommandSuccess(
    changed
      ? cloneTableWithRows(sourceTable, {}, rows)
      : prepared.value.repair
        ? sourceTable
        : tableNode,
    prepared.value.repair
  );
}

/**
 * Normalizes cell-clear options to a positive grid rectangle.
 *
 * @param options - Cell-clear options.
 * @returns Normalized rect, or null for invalid dimensions.
 */
function normalizeRect(
  options: ClearWordTableCellContentsOptions
): WordTableGridRect | null {
  if (
    options.startRow < 0
    || options.startColumn < 0
    || options.rowSpan <= 0
    || options.columnSpan <= 0
  ) {
    return null;
  }

  return {
    startRow: options.startRow,
    startColumn: options.startColumn,
    rowSpan: options.rowSpan,
    columnSpan: options.columnSpan
  };
}

/**
 * Resolves explicit source-cell keys owned by semantic cells in one rect.
 *
 * @param map - Derived Word table map.
 * @param rect - Expanded semantic-cell rectangle.
 * @returns Explicit row/cell keys whose bodies must be cleared.
 */
function getExplicitCellKeysForRect(
  map: ReturnType<typeof createWordTableMap>,
  rect: WordTableGridRect
): ReadonlySet<string> {
  const explicitById = new Map(
    map.explicitCells.map((cell) => [cell.id, cell] as const)
  );
  const keys = new Set<string>();

  for (const semanticCell of map.cellsInRect(rect)) {
    for (const explicitCellId of [
      semanticCell.originExplicitCellId,
      ...semanticCell.continuationExplicitCellIds
    ]) {
      const explicitCell = explicitById.get(explicitCellId);
      if (explicitCell) {
        keys.add(cellKey(explicitCell.rowIndex, explicitCell.cellIndex));
      }
    }
  }

  return keys;
}

/**
 * Creates one stable source cell key.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Cell index within the source row.
 * @returns Stable row/cell key.
 */
function cellKey(rowIndex: number, cellIndex: number): string {
  return `${rowIndex}:${cellIndex}`;
}
