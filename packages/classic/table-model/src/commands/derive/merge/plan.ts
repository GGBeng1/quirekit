import type { Node as PMNode } from "@quirekit/pm";
import {
  type WordTableGridRect,
  type WordTableMap,
} from "../../../map";
import { createEmptyWordTableCellNode } from "../node/builder";
import { cloneRowWithAttrs } from "../node/clone";
import { getWordTableCommandNodeTypesFromTable } from "../node/builder";
import {
  collectAffectedCellKeys,
  collectAffectedExplicitIds,
  collectMergedContent,
  getExplicitCellNode,
  getCellKey,
  sortSemanticCells,
} from "./content";

/** Prepared data for one merge operation. */
export interface MergePlan {
  /** Expanded rectangle that will become one semantic cell. */
  readonly rect: WordTableGridRect;
  /** Replacement rows for the resulting table. */
  readonly rows: readonly PMNode[];
}

/** Internal merge ownership plan. */
interface MergeCellPlan {
  /** Expanded rectangle that will become one semantic cell. */
  readonly rect: WordTableGridRect;
  /** Row/cell keys consumed by the merge. */
  readonly affectedCellKeys: ReadonlySet<string>;
  /** Row/cell key for the merged origin cell. */
  readonly originCellKey: string;
  /** Origin cell node after content and attrs are merged. */
  readonly mergedOriginCell: PMNode;
}

/**
 * Creates replacement rows for a validated merge operation.
 *
 * @param tableNode - Source table node.
 * @param map - Derived table map.
 * @param rect - Expanded merge rectangle.
 * @returns Merge plan, or null when no origin cell exists.
 */
export function createMergePlan(
  tableNode: PMNode,
  map: WordTableMap,
  rect: WordTableGridRect
): MergePlan | null {
  const cellPlan = createMergeCellPlan(tableNode, map, rect);

  if (!cellPlan) {
    return null;
  }

  const nodeTypes = getWordTableCommandNodeTypesFromTable(tableNode);
  const rows = tableNode.children.map((row, rowIndex) => {
    let addedContinuation = false;
    const cells: PMNode[] = [];

    row.children.forEach((cell, cellIndex) => {
      const key = getCellKey(rowIndex, cellIndex);

      if (!cellPlan.affectedCellKeys.has(key)) {
        cells.push(cell);
        return;
      }

      if (key === cellPlan.originCellKey) {
        cells.push(cellPlan.mergedOriginCell);
        return;
      }

      if (rowIndex > cellPlan.rect.startRow && !addedContinuation) {
        cells.push(createEmptyWordTableCellNode(nodeTypes, {
          colspan: cellPlan.rect.columnSpan,
          gridSpan: cellPlan.rect.columnSpan,
          rowspan: 1,
          vMerge: "continue",
        }));
        addedContinuation = true;
      }
    });

    return cloneRowWithAttrs(row, {}, cells);
  });

  return { rect: cellPlan.rect, rows };
}

/**
 * Creates the cell ownership portion of a merge plan.
 *
 * @param tableNode - Source table node.
 * @param map - Derived table map.
 * @param rect - Expanded merge rectangle.
 * @returns Merge cell plan, or null when no origin cell exists.
 */
function createMergeCellPlan(
  tableNode: PMNode,
  map: WordTableMap,
  rect: WordTableGridRect
): MergeCellPlan | null {
  const originSemanticCell = map.cellAt(rect.startRow, rect.startColumn);

  if (!originSemanticCell) {
    return null;
  }

  const explicitCellsById = new Map(
    map.explicitCells.map((cell) => [cell.id, cell] as const)
  );
  const semanticCells = sortSemanticCells(map.cellsInRect(rect));
  const affectedExplicitIds = collectAffectedExplicitIds(semanticCells);
  const affectedCellKeys = collectAffectedCellKeys(
    affectedExplicitIds,
    explicitCellsById
  );
  const originExplicitCell = explicitCellsById.get(
    originSemanticCell.originExplicitCellId
  );

  if (!originExplicitCell) {
    return null;
  }

  const originCell = getExplicitCellNode(tableNode, originExplicitCell);
  const mergedContent = collectMergedContent(
    tableNode,
    semanticCells,
    explicitCellsById,
    originSemanticCell.id
  );
  const mergedOriginCell = originCell.type.create({
    ...originCell.attrs,
    colspan: rect.columnSpan,
    gridSpan: rect.columnSpan,
    rowspan: rect.rowSpan,
    vMerge: rect.rowSpan > 1 ? "restart" : null,
  }, mergedContent, originCell.marks);

  return {
    rect,
    affectedCellKeys,
    originCellKey: getCellKey(originExplicitCell.rowIndex, originExplicitCell.cellIndex),
    mergedOriginCell,
  };
}
