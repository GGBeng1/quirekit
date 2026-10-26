import type { Node as PMNode } from "@quirekit/pm";
import {
  createWordTableMap,
  type WordTableGridRect
} from "../../map";
import type { WordTableBorders } from "../../types";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import {
  isRectInsideMap,
  rectContainsOnlyCells
} from "../derive/grid/rect";
import { prepareWordTableCommand } from "../repair";
import type {
  SetWordTableCellBordersOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";
import { freshWordTableBorders } from "../insert";
import {
  hasAnyBorderMetadata,
  writeSemanticBorderEdge
} from "./borders/source";
import {
  explicitNilBorder,
  findAdjacentSemanticCells,
  oppositeBorderName,
  resolvePresetEdges
} from "./borders/topology";

/**
 * Applies one border topology preset to a semantic Table rectangle.
 *
 * The selection first expands through merged cells. Every explicit source cell
 * owned by one selected semantic cell receives the same edge tuple derived
 * from that semantic cell's complete grid rect, so vertical continuations
 * cannot accidentally gain a line through the middle of a merged cell.
 *
 * @param tableNode - Source Word Table node.
 * @param options - Selection rectangle, topology preset, and visible border.
 * @returns Command result containing the updated Table node.
 */
export function setWordTableCellBorders(
  tableNode: PMNode,
  options: SetWordTableCellBordersOptions
): WordTableCommandResult<PMNode> {
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const sourceTable = prepared.value.tableNode;
  const map = createWordTableMap(sourceTable);
  const requestedRect = normalizeBorderRect(options);

  if (!requestedRect || !isRectInsideMap(map, requestedRect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rect = map.expandRectToMergedCells(requestedRect);
  if (!isRectInsideMap(map, rect) || !rectContainsOnlyCells(map, rect)) {
    return wordTableCommandFailure("invalid-selection");
  }

  const semanticById = new Map(
    map.semanticCells.map((cell) => [cell.id, cell] as const)
  );
  const bordersBySemanticId = new Map<string, WordTableBorders>();
  const appliedBorder = options.border ?? explicitNilBorder;

  // Mutate atomic physical edges, then mirror shared edges into their adjacent
  // semantic owners. This prevents an unselected neighbor from winning the
  // later OOXML-style edge conflict with stale data.
  for (const semanticCell of map.cellsInRect(rect)) {
    for (const edge of resolvePresetEdges(semanticCell, rect, options.preset)) {
      writeSemanticBorderEdge(
        bordersBySemanticId,
        sourceTable,
        map,
        semanticCell,
        edge,
        appliedBorder
      );
      for (const neighbor of findAdjacentSemanticCells(map, semanticCell, edge)) {
        writeSemanticBorderEdge(
          bordersBySemanticId,
          sourceTable,
          map,
          neighbor,
          oppositeBorderName[edge],
          appliedBorder
        );
      }
    }
  }

  const bordersByCellKey = new Map<string, WordTableBorders>();
  for (const [semanticId, borders] of bordersBySemanticId) {
    const semanticCell = semanticById.get(semanticId);
    if (!semanticCell) continue;
    const explicitIds = new Set([
      semanticCell.originExplicitCellId,
      ...semanticCell.continuationExplicitCellIds
    ]);
    for (const explicit of map.explicitCells) {
      if (explicitIds.has(explicit.id)) {
        bordersByCellKey.set(cellKey(explicit.rowIndex, explicit.cellIndex), borders);
      }
    }
  }

  const rows = sourceTable.children.map((row, rowIndex) =>
    cloneRowWithAttrs(row, {}, row.children.map((cell, cellIndex) => {
      const borders = bordersByCellKey.get(cellKey(rowIndex, cellIndex));
      return borders === undefined
        ? cell
        : cloneCellWithAttrs(cell, { borders });
    }))
  );
  const tableAttrs = hasAnyBorderMetadata(sourceTable)
    ? {}
    : { borders: freshWordTableBorders };

  return wordTableCommandSuccess(
    cloneTableWithRows(sourceTable, tableAttrs, rows),
    prepared.value.repair
  );
}

/**
 * Normalizes a border command rectangle.
 *
 * @param options - Border command options.
 * @returns Valid positive rectangle, or null.
 */
function normalizeBorderRect(
  options: SetWordTableCellBordersOptions
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
 * Creates a stable explicit-cell lookup key.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Source cell index.
 * @returns Stable lookup key.
 */
function cellKey(rowIndex: number, cellIndex: number): string {
  return `${rowIndex}:${cellIndex}`;
}
