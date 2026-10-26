import type { AnyCommands, CommandSpec } from "@quirekit/core";
import {
  Selection,
  TextSelection,
  type Node as PMNode,
  type Transaction
} from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import { WordTableSelection } from "../../selection";
import { replaceWordTableNode } from "../derive/steps/replace";
import { wordTableRepairTransactionMeta } from "../repair";
import { addWordTableRow } from "../row";

/** Direction of keyboard cell traversal. */
export type WordTableCellTraversalDirection = "forward" | "backward";

/** Innermost table cell that owns the current selection. */
interface ActiveWordTableCell {
  /** Absolute position before the owning table. */
  readonly tablePos: number;
  /** Owning table node. */
  readonly table: PMNode;
  /** Table-relative position before the explicit cell. */
  readonly cellPos: number;
}

/**
 * Creates keyboard traversal commands for Word table cells.
 *
 * @returns Editor command map for Tab-style cell navigation.
 */
export function createWordTableNavigationEditorCommands(): AnyCommands {
  return { moveToWordTableCell: createMoveToWordTableCellCommand() };
}

/**
 * Creates the Tab-style traversal command.
 *
 * Forward traversal from the last cell appends a row with the last row's shape and
 * enters its first cell, all in one transaction. Backward traversal from the first
 * cell stays in place. The target cell's content is selected, like Word.
 *
 * @returns Command accepting a traversal direction.
 */
function createMoveToWordTableCellCommand(): CommandSpec {
  return (direction: WordTableCellTraversalDirection) => (context) => {
    if (direction !== "forward" && direction !== "backward") return false;
    const active = resolveActiveWordTableCell(context.tr.selection);
    if (active === null) return false;
    const map = createWordTableMap(active.table);
    const current = map.findSemanticCell(active.cellPos);
    if (current === null) return false;
    const cells = map.semanticCells;
    const index = cells.findIndex((cell) => cell.id === current.id);
    const collapseCellSelection = context.tr.selection instanceof WordTableSelection;
    let targetCellPos: number | undefined;

    // A structural cell selection collapses into its first cell before any movement.
    if (collapseCellSelection) {
      targetCellPos = current.originCellPos;
    } else if (direction === "backward") {
      targetCellPos = cells[Math.max(0, index - 1)]?.originCellPos;
    } else if (index + 1 < cells.length) {
      targetCellPos = cells[index + 1]!.originCellPos;
    } else {
      if (!context.editor.isEditable) return false;
      const appended = appendRow(context.tr, active);
      if (appended === null) return false;
      targetCellPos = appended;
    }
    if (targetCellPos === undefined) return false;
    const selection = selectCellContent(context.tr, active.tablePos + targetCellPos);
    if (selection === null) return false;
    context.tr.setSelection(selection);
    if (!context.editor.state.pm.filterTransaction(context.tr)) {
      if (context.dispatch !== undefined) context.tr.setMeta("preventDispatch", true);
      return false;
    }
    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}

/**
 * Finds the innermost table cell containing the selection head.
 *
 * @param selection - Current selection.
 * @returns Active cell, or null outside tables.
 */
function resolveActiveWordTableCell(selection: Selection): ActiveWordTableCell | null {
  if (selection instanceof WordTableSelection) {
    const table = selection.$anchor.doc.nodeAt(selection.tablePos);
    const cell = table === null
      ? null
      : createWordTableMap(table).cellAt(selection.rect.startRow, selection.rect.startColumn);
    return table === null || cell === null
      ? null
      : { tablePos: selection.tablePos, table, cellPos: cell.originCellPos };
  }
  const $head = selection.$head;
  for (let depth = $head.depth; depth > 1; depth -= 1) {
    if ($head.node(depth).type.name !== "wordTableCell") continue;
    for (let tableDepth = depth - 1; tableDepth > 0; tableDepth -= 1) {
      if ($head.node(tableDepth).type.name !== "wordTable") continue;
      const tablePos = $head.before(tableDepth);
      return { tablePos, table: $head.node(tableDepth), cellPos: $head.before(depth) - tablePos };
    }
  }
  return null;
}

/**
 * Appends one row shaped like the last row.
 *
 * @param tr - Transaction receiving the row insertion.
 * @param active - Active cell and owning table.
 * @returns Table-relative position of the new row's first cell, or null when the append fails.
 */
function appendRow(tr: Transaction, active: ActiveWordTableCell): number | null {
  const result = addWordTableRow(active.table, {
    rowIndex: active.table.childCount - 1,
    side: "after",
    copyRowShape: true
  });
  if (!result.ok) return null;
  if (result.repair) tr.setMeta(wordTableRepairTransactionMeta, result.repair);
  replaceWordTableNode(tr, active.tablePos, active.table, result.value, "minimal");
  const map = createWordTableMap(result.value);
  const lastRow = map.height - 1;
  return map.semanticCells.find((cell) => cell.rect.startRow === lastRow)?.originCellPos ?? null;
}

/**
 * Selects a cell's whole content, or places the caret at its start when it is empty.
 *
 * @param tr - Transaction holding the current document.
 * @param cellPos - Absolute position before the target cell.
 * @returns Selection inside the cell, or null when the cell has no editable position.
 */
function selectCellContent(tr: Transaction, cellPos: number): Selection | null {
  const cell = tr.doc.nodeAt(cellPos);
  if (cell?.type.name !== "wordTableCell") return null;
  const cellEnd = cellPos + cell.nodeSize;
  const start = Selection.findFrom(tr.doc.resolve(cellPos + 1), 1, true);
  if (start === null || start.from >= cellEnd) return null;
  const end = Selection.findFrom(tr.doc.resolve(cellEnd - 1), -1, true);
  if (
    end === null
    || end.to <= start.from
    || !(start instanceof TextSelection)
    || !(end instanceof TextSelection)
  ) {
    return start;
  }
  return TextSelection.create(tr.doc, start.from, end.to);
}
