import type { Node as PMNode } from "@quirekit/pm";
import type {
  WordTableMap,
  WordTableSemanticCellRef,
} from "../../../map";
import { getWordTableCommandNodeTypesFromTable } from "../node/builder";
import {
  cloneRowWithAttrs,
  cloneTableWithRows,
} from "../node/clone";
import {
  createSplitCellsForRow,
  expandCellOverInsertedSplitRows,
} from "./cells";
import {
  expandRowOverInsertedSplitColumns,
  expandTableGridForSplit,
} from "./columns";
import { getSplitCellKey } from "./key";
import { createInsertedSplitRows } from "./rows";

/** Options used to split one semantic cell. */
interface SplitSemanticCellOptions {
  /** Requested output row count. */
  readonly rowCount: number;
  /** Requested output column count. */
  readonly columnCount: number;
}

/**
 * Applies a validated split to a semantic cell.
 *
 * @param tableNode - Source table node.
 * @param map - Derived table map.
 * @param semanticCell - Semantic cell to split.
 * @param options - Requested output cell grid size.
 * @returns Updated table node, or null when the split cannot be represented safely.
 */
export function splitSemanticCell(
  tableNode: PMNode,
  map: WordTableMap,
  semanticCell: WordTableSemanticCellRef,
  options: SplitSemanticCellOptions
): PMNode | null {
  const nodeTypes = getWordTableCommandNodeTypesFromTable(tableNode);
  const explicitCellsById = new Map(
    map.explicitCells.map((cell) => [cell.id, cell] as const)
  );
  const affectedKeys = new Set<string>();
  const extraRowCount = options.rowCount - semanticCell.rect.rowSpan;
  const extraColumnCount = options.columnCount - semanticCell.rect.columnSpan;

  if (extraRowCount < 0 || extraColumnCount < 0) {
    return null;
  }

  for (const explicitCellId of [
    semanticCell.originExplicitCellId,
    ...semanticCell.continuationExplicitCellIds
  ]) {
    const explicitCell = explicitCellsById.get(explicitCellId);

    if (explicitCell) {
      affectedKeys.add(getSplitCellKey(explicitCell.rowIndex, explicitCell.cellIndex));
    }
  }

  const originExplicitCell = explicitCellsById.get(semanticCell.originExplicitCellId);
  const originCell = originExplicitCell
    ? tableNode.child(originExplicitCell.rowIndex).child(originExplicitCell.cellIndex)
    : null;
  const rows: PMNode[] = [];

  for (const [rowIndex, row] of tableNode.children.entries()) {
    let replaced = false;
    const cells: PMNode[] = [];

    for (const [cellIndex, cell] of row.children.entries()) {
      const key = getSplitCellKey(rowIndex, cellIndex);

      if (!affectedKeys.has(key)) {
        const expandedCell = rowIndex === semanticCell.rect.startRow && extraRowCount > 0
          ? expandCellOverInsertedSplitRows(cell, extraRowCount)
          : cell;

        if (!expandedCell) {
          return null;
        }

        cells.push(expandedCell);
        continue;
      }

      if (!replaced) {
        cells.push(...createSplitCellsForRow({
          sourceCell: originCell ?? cell,
          usesSourceContent: rowIndex === semanticCell.rect.startRow,
          columnCount: options.columnCount,
          nodeTypes,
        }));
        replaced = true;
      }
    }

    if (replaced) {
      rows.push(cloneRowWithAttrs(row, {}, cells));

      if (rowIndex === semanticCell.rect.startRow && extraRowCount > 0) {
        rows.push(...createInsertedSplitRows({
          sourceRow: row,
          affectedKeys,
          sourceRowIndex: rowIndex,
          rowCount: extraRowCount,
          columnCount: options.columnCount,
          nodeTypes,
        }));
      }

      continue;
    }

    const expandedRow = extraColumnCount > 0
      ? expandRowOverInsertedSplitColumns(row, semanticCell, extraColumnCount)
      : row;

    if (!expandedRow) {
      return null;
    }

    rows.push(expandedRow);
  }

  const tableAttrs = extraColumnCount > 0
    ? { grid: expandTableGridForSplit(tableNode, map, semanticCell, extraColumnCount) }
    : {};

  return cloneTableWithRows(tableNode, tableAttrs, rows);
}
