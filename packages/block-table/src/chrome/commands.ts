import type { Editor, QuireMountedTableChromeModel } from "@quirekit/core";
import type { EditorUITableInsertionRequest, EditorUITableMoveRequest, EditorUITableResizeRequest } from "@quirekit/editor-ui/vue";
import type { WordTableGridColumn } from "@quirekit/classic-table-model";
import type { BlockTableTarget } from "../ui/types";

/** @param editor - Session. @param target - Captured document identity. @returns Whether this gesture may commit. */
export function tableTargetCurrent(editor: Editor, target: BlockTableTarget): boolean {
  return !editor.isDestroyed && editor.isEditable && editor.state.doc === target.doc;
}
/** @param editor - Session. @param target - Source. @param request - Explicit gap. @returns Command completion. */
export function insertTableBoundary(editor: Editor, target: BlockTableTarget, request: EditorUITableInsertionRequest): boolean {
  if (!tableTargetCurrent(editor, target)) return false;
  const index = request.boundaryIndex, length = request.axis === "row" ? target.map.height : target.map.width;
  if (!Number.isInteger(index) || index < 0 || index > length) return false;
  const side = index === length ? "after" : "before";
  const chain = editor.chain().closeHistory();
  return (request.axis === "row" ? chain.addWordTableRow({ tablePos: target.tablePos, rowIndex: Math.min(index, length - 1), side })
    : chain.addWordTableColumn({ tablePos: target.tablePos, columnIndex: Math.min(index, length - 1), side })).run();
}
/** @param editor - Session. @param target - Source. @param request - Explicit structural move. @returns Command completion. */
export function moveTableAxis(editor: Editor, target: BlockTableTarget, request: EditorUITableMoveRequest): boolean {
  if (!tableTargetCurrent(editor, target)) return false;
  const options = { tablePos: target.tablePos, from: request.from, to: request.to, targetIndex: request.targetIndex };
  const chain = editor.chain().closeHistory();
  return (request.axis === "row" ? chain.moveWordTableRows(options) : chain.moveWordTableColumns(options)).run();
}
/**
 * Persists actual widths together, so imported cell preferences cannot undo the drag.
 * @param editor - Command/history owner.
 * @param target - Exact source table.
 * @param widths - Unscaled CSS pixels for every logical column.
 * @returns One atomic canonical command-chain result.
 */
export function writeTableWidths(editor: Editor, target: BlockTableTarget, widths: readonly number[]): boolean {
  if (!tableTargetCurrent(editor, target) || widths.length !== target.map.width || widths.some(value => !Number.isFinite(value) || value <= 0)) return false;
  const old = target.doc.nodeAt(target.tablePos)!.attrs.grid as readonly WordTableGridColumn[] | null;
  const grid = widths.map((width, index) => ({ ...old?.[index], width: { value: Math.round(width * 15), unit: "dxa" as const } }));
  const chain = editor.chain();
  if (typeof editor.commands.closeHistory === "function") chain.closeHistory();
  chain.setWordTableAttrs({ tablePos: target.tablePos, attrs: { grid, tableLayout: "fixed", width: { value: grid.reduce((sum, col) => sum + col.width.value, 0), unit: "dxa" } } });
  for (const cell of target.map.semanticCells) {
    const width = grid.slice(cell.rect.startColumn, cell.rect.startColumn + cell.rect.columnSpan).reduce((sum, col) => sum + col.width.value, 0);
    chain.setWordTableCellAttrs({ tablePos: target.tablePos, ...cell.rect, attrs: { width: { value: width, unit: "dxa" } } });
  }
  return chain.run();
}
/** @param editor - Session. @param target - Source. @param model - Measured source sizes. @param request - Finished gesture. @returns Atomic resize completion. */
export function resizeTableAxis(editor: Editor, target: BlockTableTarget, model: QuireMountedTableChromeModel, request: EditorUITableResizeRequest): boolean {
  if (!tableTargetCurrent(editor, target) || model.sourceDocument !== target.doc || !model.sizing || !Number.isFinite(request.size) || request.size <= 0) return false;
  const sizes = request.axis === "column" ? model.sizing.columnWidths : model.sizing.rowHeights;
  if (!Number.isInteger(request.index) || request.index < 0 || request.index >= sizes.length || Math.abs(sizes[request.index]! - request.size) < 0.1) return false;
  if (request.axis === "column") { const widths = [...sizes]; widths[request.index] = request.size; return writeTableWidths(editor, target, widths); }
  const height = target.doc.nodeAt(target.tablePos)!.child(request.index).attrs.height;
  const chain = editor.chain(); if (typeof editor.commands.closeHistory === "function") chain.closeHistory();
  return chain.setWordTableRowHeight({ tablePos: target.tablePos, rowIndex: request.index, height: { value: Math.max(1, Math.round(request.size * 15)), rule: height?.rule === "exact" ? "exact" : "atLeast" } }).run();
}
