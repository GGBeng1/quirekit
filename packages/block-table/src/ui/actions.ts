import type { Editor } from "@quirekit/core";
import { createWordTableMap, WordTableSelection } from "@quirekit/classic-table-model";
import type { BlockTableAction, BlockTableTarget } from "./types";
import type { Node } from "@quirekit/pm";

const maps = new WeakMap<Node, ReturnType<typeof createWordTableMap>>();
/** @param node - Immutable table source. @returns A map reused across caret-only updates. */
function tableMap(node: Node): ReturnType<typeof createWordTableMap> {
  let map = maps.get(node);
  if (!map) { map = createWordTableMap(node); maps.set(node, map); }
  return map;
}

/** @param editor - Editing session. @param position - Optional hover position without changing selection. @returns Innermost table target using only canonical model positions. */
export function captureTableTarget(editor: Editor, position?: number): BlockTableTarget | null {
  const { doc, selection } = editor.state.pm;
  if (position === undefined && selection instanceof WordTableSelection) {
    const table = doc.nodeAt(selection.tablePos);
    return table ? { doc, tablePos: selection.tablePos, map: tableMap(table), rect: selection.rect } : null;
  }
  const head = position === undefined ? selection.$head : doc.resolve(position);
  for (let depth = head.depth; depth > 1; depth--) {
    if (head.node(depth).type.name !== "wordTableCell") continue;
    for (let parent = depth - 1; parent > 0; parent--) {
      if (head.node(parent).type.name !== "wordTable") continue;
      const tablePos = head.before(parent);
      const map = tableMap(head.node(parent));
      const cell = map.findSemanticCell(head.before(depth) - tablePos);
      return cell ? { doc, tablePos, map, rect: cell.rect } : null;
    }
  }
  return null;
}

/**
 * Routes availability and execution through the same typed table command.
 * @param editor - Canonical editing session.
 * @param target - Menu-open snapshot, never the later caret.
 * @param action - Requested operation.
 * @param dryRun - Whether to validate without mutation.
 * @returns Whether the command is applicable or was applied.
 */
export function executeTableAction(editor: Editor, target: BlockTableTarget, action: BlockTableAction, dryRun = false): boolean {
  if (editor.isDestroyed || !editor.isEditable || editor.state.doc !== target.doc) return false;
  const commands = dryRun ? editor.can() : editor.commands;
  if (!dryRun && !action.startsWith("select")) editor.commands.closeHistory();
  const { tablePos, map, rect } = target;
  const range = { tablePos, ...rect };
  switch (action) {
    case "rowBefore": return commands.addWordTableRow({ tablePos, rowIndex: rect.startRow, side: "before" });
    case "rowAfter": return commands.addWordTableRow({ tablePos, rowIndex: rect.startRow + rect.rowSpan - 1, side: "after" });
    case "columnBefore": return commands.addWordTableColumn({ tablePos, columnIndex: rect.startColumn, side: "before" });
    case "columnAfter": return commands.addWordTableColumn({ tablePos, columnIndex: rect.startColumn + rect.columnSpan - 1, side: "after" });
    case "deleteRows": return commands.deleteWordTableRows({ tablePos, from: rect.startRow, to: rect.startRow + rect.rowSpan - 1 });
    case "deleteColumns": return commands.deleteWordTableColumns({ tablePos, from: rect.startColumn, to: rect.startColumn + rect.columnSpan - 1 });
    case "deleteTable": return commands.deleteWordTable({ tablePos });
    case "merge": return commands.mergeWordTableCells(range);
    case "split": return commands.splitWordTableCell({ tablePos, rowIndex: rect.startRow, columnIndex: rect.startColumn });
    case "clear": return commands.clearWordTableCellContents(range);
    case "clearFormat": return commands.clearWordTableCellFormatting(range);
    case "alignTop": case "alignCenter": case "alignBottom": return commands.setWordTableCellAttrs({ ...range, attrs: { verticalAlign: action === "alignTop" ? "top" : action === "alignCenter" ? "center" : "bottom" } });
    case "shadeBlue": case "shadeYellow": case "shadeNone": return commands.setWordTableCellAttrs({ ...range, attrs: { shading: action === "shadeNone" ? null : { fill: action === "shadeBlue" ? "DBEAFE" : "FEF3C7", pattern: "clear", color: "auto" } } });
    case "selectRow": case "selectColumn": case "selectTable": {
      const first = map.cellAt(action === "selectColumn" || action === "selectTable" ? 0 : rect.startRow, action === "selectRow" || action === "selectTable" ? 0 : rect.startColumn);
      const last = map.cellAt(action === "selectRow" ? rect.startRow : map.height - 1, action === "selectColumn" ? rect.startColumn : map.width - 1);
      if (!first || !last) return false;
      return commands.setWordTableSelection({ tablePos, anchorCellPos: first.originCellPos, headCellPos: last.originCellPos, mode: action === "selectRow" ? "row" : action === "selectColumn" ? "column" : "table" });
    }
  }
}
