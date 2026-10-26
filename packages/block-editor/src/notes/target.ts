import type { Editor } from "@quirekit/core";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import { restoreBlockEditorFocus } from "../ui/focus";
import type { NoteTarget } from "./types";

/** @param editor - Canonical selection owner. @returns The selected reference or the definition containing a caret, in O(depth) work. */
export function captureNoteTarget(editor: Editor): NoteTarget | null {
  if (editor.isDestroyed || !editor.isEditable) return null;
  const { doc, selection } = editor.state.pm;
  if (selection instanceof NodeSelection && selection.node.type.name === "footnoteReference") {
    return { doc, pos: selection.from, node: selection.node };
  }
  if (!(selection instanceof TextSelection) || !selection.empty) return null;
  // Only the selection's ancestors can own this toolbar. Other notes and the
  // reference index are irrelevant until an explicit navigation/delete action.
  for (let depth = selection.$from.depth; depth > 0; depth--) {
    const node = selection.$from.node(depth);
    if (node.type.name === "footnoteDefinition") return { doc, pos: selection.$from.before(depth), node };
  }
  return null;
}

/** @param editor - Command owner. @param target - Exact source that exposed the control. @param action - Navigation or complete deletion. @returns Whether the source still owns the accepted action. */
export function executeNoteAction(editor: Editor, target: NoteTarget, action: "navigate" | "delete"): boolean {
  const current = captureNoteTarget(editor);
  if (!current || current.doc !== target.doc || current.node !== target.node || current.pos !== target.pos) return false;
  const id = target.node.attrs.noteId;
  const changed = action === "delete" ? editor.commands.removeBlockFootnote(id)
    : editor.commands.navigateBlockFootnote(id, target.node.type.name === "footnoteReference" ? "definition" : "reference");
  if (changed) restoreBlockEditorFocus(editor);
  return changed;
}
