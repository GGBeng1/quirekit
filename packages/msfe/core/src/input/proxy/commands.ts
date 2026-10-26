import { deleteCharBackward, deleteCharForward, deleteGroupBackward, deleteGroupForward, insertNewlineAndIndent } from "@quirekit/cm-commands";
import { EditorView, runScopeHandlers } from "@quirekit/cm-view";
import type { TransactionSpec } from "@quirekit/cm-state";

/** @param view - Canonical command authority. @param inputType - Native beforeinput intent. @returns Whether an existing editing command handled it. */
export function runSourceInputCommand(view: EditorView, inputType: string): boolean {
  if (view.state.readOnly) return false;
  if (inputType === "deleteContentBackward") return deleteCharBackward(view);
  if (inputType === "deleteContentForward") return deleteCharForward(view);
  if (inputType === "deleteWordBackward") return deleteGroupBackward(view);
  if (inputType === "deleteWordForward") return deleteGroupForward(view);
  if (inputType === "insertParagraph" || inputType === "insertLineBreak") {
    const event = new view.dom.ownerDocument.defaultView!.KeyboardEvent("keydown", { key: "Enter", shiftKey: inputType === "insertLineBreak" });
    return runScopeHandlers(view, event, "editor") || insertNewlineAndIndent(view);
  }
  if (inputType === "historyUndo" || inputType === "historyRedo") return ["ctrlKey", "metaKey"].some(modifier => runScopeHandlers(view,
    new view.dom.ownerDocument.defaultView!.KeyboardEvent("keydown", { key: "z", [modifier]: true, shiftKey: inputType === "historyRedo" }), "editor"));
  return false;
}

/**
 * Routes ordinary typing and paste through public CM filters and its canonical transaction.
 * @param view - Single source owner.
 * @param text - Native text, excluding the proxy deletion buffer.
 * @param userEvent - Source rule/history input classification.
 * @returns Whether the insertion was accepted by the current source owner.
 */
export function insertSourceInput(view: EditorView, text: string, userEvent: string): boolean {
  if (!text || view.state.readOnly) return false;
  if (userEvent === "input.paste") for (const filter of view.state.facet(EditorView.clipboardInputFilter)) text = filter(text, view.state);
  const range = view.state.selection.main;
  const spec: TransactionSpec = { ...view.state.replaceSelection(text), userEvent, scrollIntoView: true };
  if (userEvent === "input.type" && view.state.facet(EditorView.inputHandler)
    .some(handler => handler(view, range.from, range.to, text, () => view.state.update(spec)))) return true;
  view.dispatch(spec); return true;
}
