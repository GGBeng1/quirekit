import type { Editor } from "@quirekit/core";
import { WordTableSelection } from "@quirekit/classic-table-model";
import type { EditorUITableAxis, EditorUITableMoveSource } from "@quirekit/editor-ui/vue";
import type { BlockTableTarget } from "../ui/types";
import { tableTargetCurrent } from "./commands";

/** @param editor - Session. @param target - Table. @param axis - Structural axis. @returns Existing movable range, never a caret approximation. */
export function tableMoveSource(editor: Editor, target: BlockTableTarget, axis: EditorUITableAxis): EditorUITableMoveSource | null {
  const selection = editor.state.pm.selection;
  if (!(selection instanceof WordTableSelection) || selection.tablePos !== target.tablePos || selection.mode !== axis) return null;
  const rect = selection.rect;
  return { axis, from: axis === "row" ? rect.startRow : rect.startColumn, to: axis === "row" ? rect.startRow + rect.rowSpan - 1 : rect.startColumn + rect.columnSpan - 1 };
}
/** @param editor - Session. @param target - Exact table. @param mode - Structural coverage. @param index - Optional source track. @returns Whether selection completely covers this control. */
export function tableBarSelected(editor: Editor, target: BlockTableTarget, mode: EditorUITableAxis | "table", index?: number): boolean {
  const selection = editor.state.pm.selection;
  if (!(selection instanceof WordTableSelection) || selection.tablePos !== target.tablePos) return false;
  const rect = selection.rect;
  if (mode === "table") return rect.rowSpan === target.map.height && rect.columnSpan === target.map.width;
  return index !== undefined && (mode === "row" ? rect.columnSpan === target.map.width && index >= rect.startRow && index < rect.startRow + rect.rowSpan : rect.rowSpan === target.map.height && index >= rect.startColumn && index < rect.startColumn + rect.columnSpan);
}
/** @param editor - Session. @param target - Table. @param mode - Structural intent. @param index - Source track. @param extend - Extend from current anchor. @returns Canonical selection command completion. */
export function selectTableBar(editor: Editor, target: BlockTableTarget, mode: EditorUITableAxis | "table", index?: number, extend = false): boolean {
  if (!tableTargetCurrent(editor, target)) return false;
  const current = editor.state.pm.selection;
  const first = target.map.cellAt(mode === "row" ? index ?? 0 : 0, mode === "column" ? index ?? 0 : 0);
  const last = target.map.cellAt(mode === "row" ? index ?? 0 : target.map.height - 1, mode === "column" ? index ?? 0 : target.map.width - 1);
  if (!first || !last) return false;
  return editor.commands.setWordTableSelection({ tablePos: target.tablePos, mode,
    anchorCellPos: extend && current instanceof WordTableSelection && current.tablePos === target.tablePos && current.mode === mode ? current.anchorCellPos : first.originCellPos,
    headCellPos: last.originCellPos });
}
