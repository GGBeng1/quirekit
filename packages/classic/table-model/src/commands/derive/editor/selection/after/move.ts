import { Selection } from "@quirekit/pm";
import { createWordTableMap } from "../../../../../map";
import { WordTableSelection } from "../../../../../selection";
import type {
  MoveWordTableColumnsCommandOptions,
  MoveWordTableRowsCommandOptions
} from "../../../../types";
import { getMoveRangeInsertionIndex } from "../../../shared/move-range";
import type { TableTransformSelectionContext } from "../../types";

/**
 * Keeps a moved row range structurally selected at its destination.
 *
 * @param context - Completed row-move transform.
 * @returns Structural row selection, or null for non-row source selections.
 */
export function selectMovedWordTableRows(
  context: TableTransformSelectionContext<MoveWordTableRowsCommandOptions>
): Selection | null {
  return selectMovedWordTableAxis(context, "row");
}

/**
 * Keeps a moved column range structurally selected at its destination.
 *
 * @param context - Completed column-move transform.
 * @returns Structural column selection, or null for non-column source selections.
 */
export function selectMovedWordTableColumns(
  context: TableTransformSelectionContext<MoveWordTableColumnsCommandOptions>
): Selection | null {
  return selectMovedWordTableAxis(context, "column");
}

/**
 * Resolves a moved axis range to a structural selection in the replacement table.
 *
 * @param context - Completed axis-move transform.
 * @param axis - Row or column axis.
 * @returns Structural selection at the destination, or null when source mode differs.
 */
function selectMovedWordTableAxis(
  context: TableTransformSelectionContext<
    MoveWordTableRowsCommandOptions | MoveWordTableColumnsCommandOptions
  >,
  axis: "row" | "column"
): Selection | null {
  if (
    !(context.selection instanceof WordTableSelection)
    || context.selection.tablePos !== context.tablePos
    || context.selection.mode !== axis
  ) {
    return null;
  }
  const from = context.options.from;
  const to = context.options.to ?? from;
  const start = getMoveRangeInsertionIndex(
    from,
    to,
    context.options.targetIndex
  );
  const end = start + to - from;
  const map = createWordTableMap(context.nextTable);
  const cells = axis === "row"
    ? [...map.rowCells(start), ...map.rowCells(end)]
    : [...map.columnCells(start), ...map.columnCells(end)];
  const anchor = cells[0];
  const head = cells.at(-1);
  if (anchor === undefined || head === undefined) {
    return null;
  }

  return WordTableSelection.create(context.tr.doc, {
    tablePos: context.tablePos,
    anchorCellPos: anchor.originCellPos,
    headCellPos: head.originCellPos,
    mode: axis
  });
}
