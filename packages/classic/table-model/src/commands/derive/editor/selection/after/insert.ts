import {
  Selection,
  type Node as PMNode,
  type Transaction
} from "@quirekit/pm";
import { createWordTableMap } from "../../../../../map";
import { WordTableSelection } from "../../../../../selection";
import type {
  AddWordTableColumnCommandOptions,
  AddWordTableRowCommandOptions
} from "../../../../types";
import type { TableTransformSelectionContext } from "../../types";

/**
 * Places the caret in a newly inserted row near the initiating column.
 *
 * @param context - Completed row-insertion transform.
 * @returns Selection inside the inserted row, or null when no editable cell exists.
 */
export function selectInsertedWordTableRow(
  context: TableTransformSelectionContext<AddWordTableRowCommandOptions>
): Selection | null {
  const active = resolveActiveGridCoordinate(
    context.previousTable,
    context.tablePos,
    context.selection
  );
  const map = createWordTableMap(context.nextTable);
  const rowIndex = context.options.rowIndex
    + (context.options.side === "after" ? 1 : 0);

  return createSelectionInsideCell(
    context.tr,
    context.tablePos,
    map.cellAt(
      rowIndex,
      clampAxisIndex(active?.columnIndex ?? 0, map.width)
    )?.originCellPos
  );
}

/**
 * Places the caret in a newly inserted column near the initiating row.
 *
 * @param context - Completed column-insertion transform.
 * @returns Selection inside the inserted column, or null when no editable cell exists.
 */
export function selectInsertedWordTableColumn(
  context: TableTransformSelectionContext<AddWordTableColumnCommandOptions>
): Selection | null {
  const active = resolveActiveGridCoordinate(
    context.previousTable,
    context.tablePos,
    context.selection
  );
  const map = createWordTableMap(context.nextTable);
  const columnIndex = context.options.columnIndex
    + (context.options.side === "after" ? 1 : 0);

  return createSelectionInsideCell(
    context.tr,
    context.tablePos,
    map.cellAt(
      clampAxisIndex(active?.rowIndex ?? 0, map.height),
      columnIndex
    )?.originCellPos
  );
}

/**
 * Resolves the source selection to one visible Table grid coordinate.
 *
 * @param table - Table before the transform.
 * @param tablePos - Absolute position before the Table.
 * @param selection - Canonical selection before replacement.
 * @returns Active row and column, or null outside explicit cells.
 */
function resolveActiveGridCoordinate(
  table: PMNode,
  tablePos: number,
  selection: Selection
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  if (
    selection instanceof WordTableSelection
    && selection.tablePos === tablePos
  ) {
    return {
      rowIndex: selection.rect.startRow,
      columnIndex: selection.rect.startColumn
    };
  }
  const map = createWordTableMap(table);
  let explicitCellPos: number | undefined;
  for (let depth = selection.$head.depth; depth > 0; depth -= 1) {
    if (selection.$head.node(depth).type.name === "wordTableCell") {
      explicitCellPos = selection.$head.before(depth) - tablePos;
      break;
    }
  }
  const explicit = explicitCellPos === undefined
    ? null
    : map.findExplicitCell(explicitCellPos);
  return explicit === null
    ? null
    : {
        rowIndex: explicit.rowIndex,
        columnIndex: explicit.range.startColumn
      };
}

/**
 * Finds the first editable selection inside one explicit cell.
 *
 * @param tr - Transaction after Table replacement.
 * @param tablePos - Absolute position before the Table.
 * @param cellPos - Table-relative position before the target cell.
 * @returns Editable selection inside the cell, or null when unresolved.
 */
function createSelectionInsideCell(
  tr: Transaction,
  tablePos: number,
  cellPos: number | undefined
): Selection | null {
  if (cellPos === undefined) {
    return null;
  }
  const absoluteCellPos = tablePos + cellPos;
  const cell = tr.doc.nodeAt(absoluteCellPos);
  if (cell?.type.name !== "wordTableCell") {
    return null;
  }
  const selection = Selection.findFrom(
    tr.doc.resolve(absoluteCellPos + 1),
    1,
    true
  );
  return selection !== null
    && selection.from < absoluteCellPos + cell.nodeSize
    ? selection
    : null;
}

/**
 * Clamps one coordinate to a non-empty axis.
 *
 * @param index - Requested axis coordinate.
 * @param length - Axis length.
 * @returns Valid zero-based coordinate.
 */
function clampAxisIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}
