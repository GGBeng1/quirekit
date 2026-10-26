import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableMap } from "../../../map";
import { getRectEndRow } from "../../../map/range";
import { readWordTableCellSpan } from "../grid/ranges";
import {
  createEmptyWordTableCellNode,
  createWordTableRowNode,
  getWordTableCommandNodeTypesFromTable
} from "../node/builder";

/** Vertical merge continuation that crosses a newly inserted row. */
interface RowContinuationPlan {
  /** Start grid column of the continuation range. */
  readonly startColumn: number;
  /** Grid column span covered by the continuation range. */
  readonly columnSpan: number;
}

/**
 * Creates a full-width row for an insertion point.
 *
 * @param tableNode - Source table node.
 * @param map - Derived table map.
 * @param insertRowIndex - New row index.
 * @returns New row node.
 */
export function createFullWidthRowAt(
  tableNode: PMNode,
  map: WordTableMap,
  insertRowIndex: number
): PMNode {
  return createFullWidthRow(
    tableNode,
    map.width,
    getContinuationsAt(map, insertRowIndex)
  );
}

/**
 * Creates an empty row using an adjacent row's spans and offsets.
 *
 * @param tableNode - Source table node.
 * @param rowIndex - Adjacent source row index.
 * @returns New row node.
 */
export function createRowFromAdjacentShape(
  tableNode: PMNode,
  rowIndex: number
): PMNode {
  const nodeTypes = getWordTableCommandNodeTypesFromTable(tableNode);
  const sourceRow = tableNode.child(rowIndex);
  const cells = sourceRow.children.map((cell) => {
    const span = readWordTableCellSpan(cell);

    return createEmptyWordTableCellNode(nodeTypes, {
      colspan: span,
      gridSpan: span,
      rowspan: 1,
      vMerge: null
    });
  });

  return createWordTableRowNode(nodeTypes, cells, {
    gridBefore: sourceRow.attrs.gridBefore,
    gridAfter: sourceRow.attrs.gridAfter
  });
}

/**
 * Creates a row matching the table width and active vertical merge chains.
 *
 * @param tableNode - Source table node.
 * @param width - Canonical table width.
 * @param continuations - Vertical merge continuations crossing the new row.
 * @returns New row node.
 */
function createFullWidthRow(
  tableNode: PMNode,
  width: number,
  continuations: readonly RowContinuationPlan[]
): PMNode {
  const nodeTypes = getWordTableCommandNodeTypesFromTable(tableNode);
  const cells: PMNode[] = [];
  let column = 0;

  while (column < width) {
    const continuation = continuations.find((item) =>
      item.startColumn === column
    );

    if (continuation) {
      cells.push(createEmptyWordTableCellNode(nodeTypes, {
        colspan: continuation.columnSpan,
        gridSpan: continuation.columnSpan,
        rowspan: 1,
        vMerge: "continue"
      }));
      column += continuation.columnSpan;
    } else {
      cells.push(createEmptyWordTableCellNode(nodeTypes));
      column += 1;
    }
  }

  return createWordTableRowNode(nodeTypes, cells);
}

/**
 * Gets vertical merge continuations that cross an insertion row.
 *
 * @param map - Table map.
 * @param insertRowIndex - New row index.
 * @returns Continuation plans in column order.
 */
function getContinuationsAt(
  map: WordTableMap,
  insertRowIndex: number
): readonly RowContinuationPlan[] {
  return map.semanticCells
    .filter((cell) =>
      cell.rect.startRow < insertRowIndex &&
      insertRowIndex < getRectEndRow(cell.rect)
    )
    .map((cell) => ({
      startColumn: cell.rect.startColumn,
      columnSpan: cell.rect.columnSpan
    }))
    .sort((left, right) => left.startColumn - right.startColumn);
}
