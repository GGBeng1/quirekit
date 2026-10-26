import { EditorSelection } from "@quirekit/cm-state";
import { requestMarkdownParse, type MsfeEditor } from "@quirekit/msfe-core";

/**
 * Navigates confirmed heading positions without editing or entering history, including readonly mode.
 * @param editor - Canonical owner. @param direction - Next or previous heading. @param name - Installed semantic name.
 * @returns Whether a confirmed destination was reached; pending parsing requests the shared scheduler.
 */
export function navigateHeading(editor: MsfeEditor, direction: 1 | -1 = 1, name = "heading"): boolean {
  if (editor.scope.disposed || editor.documentScope.disposed) return false;
  const result = editor.querySource(name, { from: 0, to: editor.state.doc.length });
  if (result.status === "pending") { requestMarkdownParse(editor.state); return false; }
  const position = editor.state.selection.main.head;
  const target = direction > 0 ? result.matches.find(match => match.from > position) : [...result.matches].reverse().find(match => match.from < position);
  if (!target) return false;
  editor.setSelection(EditorSelection.single(target.from)); editor.scrollTo(target.from); editor.focus(); return true;
}
