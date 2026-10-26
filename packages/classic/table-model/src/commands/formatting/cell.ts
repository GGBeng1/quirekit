import type { Node as PMNode } from "@quirekit/pm";
import {
  createWordTableMap,
  type WordTableGridRect
} from "../../map";
import {
  isRectInsideMap,
  rectContainsOnlyCells
} from "../derive/grid/rect";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import { prepareWordTableCommand } from "../repair";
import type {
  ClearWordTableCellFormattingOptions,
  SetWordTableCellAttrsOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";

const clearCellFormattingAttrs = {
  borders: null,
  shading: null,
  backgroundColor: null,
  noWrap: null,
  cellMargins: null,
  textDirection: null,
  fitText: null,
  verticalAlign: null,
  hideMark: null,
  conditionalStyle: null
} as const;

/**
 * Updates cell attrs across a Word table grid rectangle.
 *
 * Partially covered merged cells are formatted atomically by expanding the
 * requested rectangle through the table map before source cells are cloned.
 *
 * @param tableNode - Source table node.
 * @param options - Cell formatting options.
 * @returns Command result containing the updated table node.
 */
export function setWordTableCellAttrs(
  tableNode: PMNode,
  options: SetWordTableCellAttrsOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const requestedRect = normalizeCellFormatRect(options);

  if (!requestedRect || !isRectInsideMap(map, requestedRect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rect = map.expandRectToMergedCells(requestedRect);

  if (!isRectInsideMap(map, rect) || !rectContainsOnlyCells(map, rect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const targetKeys = getExplicitCellKeysForRect(map, rect);
  const rows = sourceTable.children.map((row, rowIndex) => {
    const cells = row.children.map((cell, cellIndex) =>
      targetKeys.has(getCellKey(rowIndex, cellIndex))
        ? cloneCellWithAttrs(cell, options.attrs)
        : cell
    );

    return cloneRowWithAttrs(row, {}, cells);
  });

  return wordTableCommandSuccess(
    cloneTableWithRows(sourceTable, {}, rows),
    prepared.value.repair
  );
}

/**
 * Clears direct cell styling attrs across a Word table grid rectangle.
 *
 * Structural attrs such as `gridSpan`, `rowspan`, `vMerge`, and `hMerge` are
 * intentionally preserved so clear-formatting does not change table topology.
 *
 * @param tableNode - Source table node.
 * @param options - Clear-formatting rectangle options.
 * @returns Command result containing the updated table node.
 */
export function clearWordTableCellFormatting(
  tableNode: PMNode,
  options: ClearWordTableCellFormattingOptions
): WordTableCommandResult<PMNode> {
  return setWordTableCellAttrs(tableNode, {
    ...options,
    attrs: clearCellFormattingAttrs
  });
}

/**
 * Normalizes cell formatting options to a grid rect.
 *
 * @param options - Cell formatting options to normalize.
 * @returns Grid rect, or null when dimensions are invalid.
 */
function normalizeCellFormatRect(
  options: ClearWordTableCellFormattingOptions
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
    columnSpan: options.columnSpan
  };
}

/**
 * Resolves source explicit cells owned by semantic cells intersecting a rect.
 *
 * @param map - Derived table map.
 * @param rect - Expanded formatting rect.
 * @returns Source row/cell keys for explicit cells that should be updated.
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
    const explicitCellIds = [
      semanticCell.originExplicitCellId,
      ...semanticCell.continuationExplicitCellIds
    ];

    for (const explicitCellId of explicitCellIds) {
      const explicitCell = explicitById.get(explicitCellId);

      if (explicitCell) {
        keys.add(getCellKey(explicitCell.rowIndex, explicitCell.cellIndex));
      }
    }
  }

  return keys;
}

/**
 * Creates a stable source cell key.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Source cell index within the row.
 * @returns Source cell key.
 */
function getCellKey(rowIndex: number, cellIndex: number): string {
  return `${rowIndex}:${cellIndex}`;
}
