import { EditorSelection } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { sourceBlockAt, readSourcePresentation, type MsfeEditor, type MsfeTarget } from "@quirekit/msfe-core";
import type { QuireKitActionMenuEntry } from "@quirekit/ui";
import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";

/** @param editor - Current source owner. @param target - Versioned chrome intent. @param value - Explicit range shortcut. @returns Admitted source selection without changing history or content. */
function range(editor: MsfeEditor, target: MsfeTarget | undefined, value: string): EditorSelection | null {
  const current = editor.captureTarget();
  if (!target || target.instanceId !== current.instanceId || target.documentId !== current.documentId || target.revision !== current.revision || editor.mode === "locked") return null;
  if (value === "select-all") return EditorSelection.single(0, editor.state.doc.length);
  if (value !== "select-block") return null;
  const block = sourceBlockAt(editor.state, target.selection.main.head);
  return block ? EditorSelection.single(block.from, block.to) : null;
}

/** @param editor - Installed source owner. @param target - Current captured chrome selection. @param locale - Action language. @returns Two explicit, non-mutating selection actions. */
export function mobileSelectionActions(editor: MsfeEditor, target: MsfeTarget | null | undefined, locale: MdEditorLocale): readonly QuireKitActionMenuEntry[] {
  const text = mdEditorMessages[locale];
  return [
    { kind: "command", value: "select-all", label: text.selectAll, group: text.selection, disabled: !range(editor, target ?? undefined, "select-all") },
    { kind: "command", value: "select-block", label: text.selectBlock, group: text.selection, disabled: !range(editor, target ?? undefined, "select-block") },
  ];
}

/** @param editor - Canonical selection owner. @param target - Latest validated source intent. @param value - Selection command identity. @returns Whether one native selection was accepted. */
export function selectMobileRange(editor: MsfeEditor, target: MsfeTarget, value: string): boolean {
  const selection = range(editor, target, value);
  if (!selection || EditorView.findFromDOM(editor.element)?.composing || readSourcePresentation(editor.state).composing) return false;
  editor.setSelection(selection); return true;
}
