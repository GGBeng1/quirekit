import type { Node as PMNode } from "@quirekit/pm";
import type {
  WordTableMap,
  WordTableSemanticCellRef,
} from "../../../map";
import { getRangeEndColumn } from "../../../map/range";
import { getWordTableRowCellRanges } from "../grid/ranges";
import { insertGridColumn } from "../grid/table";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
} from "../node/clone";

/**
 * Expands an unaffected row across grid columns inserted by a split operation.
 *
 * @param row - Source row.
 * @param semanticCell - Semantic cell being split.
 * @param extraColumnCount - Number of inserted grid columns.
 * @returns Updated row, or null when no single cell covers the split range.
 */
export function expandRowOverInsertedSplitColumns(
  row: PMNode,
  semanticCell: WordTableSemanticCellRef,
  extraColumnCount: number
): PMNode | null {
  const splitStartColumn = semanticCell.rect.startColumn;
  const splitEndColumn = getRangeEndColumn(semanticCell.rect);
  const ranges = getWordTableRowCellRanges(row);
  const coveringRange = ranges.find((range) =>
    range.startColumn <= splitStartColumn &&
    getRangeEndColumn(range) >= splitEndColumn
  );

  if (!coveringRange) {
    return null;
  }

  const cells = row.children.map((cell, cellIndex) => {
    if (cellIndex !== coveringRange.cellIndex) {
      return cell;
    }

    const columnSpan = coveringRange.columnSpan + extraColumnCount;

    return cloneCellWithAttrs(cell, {
      colspan: columnSpan,
      gridSpan: columnSpan,
    });
  });

  return cloneRowWithAttrs(row, {}, cells);
}

/**
 * Expands the table grid for columns inserted by a split operation.
 *
 * @param tableNode - Source table node.
 * @param map - Derived table map.
 * @param semanticCell - Semantic cell being split.
 * @param extraColumnCount - Number of inserted grid columns.
 * @returns Updated table grid attr.
 */
export function expandTableGridForSplit(
  tableNode: PMNode,
  map: WordTableMap,
  semanticCell: WordTableSemanticCellRef,
  extraColumnCount: number
): readonly unknown[] {
  let grid = tableNode.attrs.grid as unknown;
  const insertColumn = getRangeEndColumn(semanticCell.rect);

  for (let index = 0; index < extraColumnCount; index += 1) {
    grid = insertGridColumn(grid, map.width + index, insertColumn);
  }

  return Array.isArray(grid) ? grid : [];
}
