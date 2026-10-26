import type { Editor } from "@quirekit/core";
import type { HorizontalRuleStyleInput } from "@quirekit/extension-horizontal-rule";
import { restoreBlockEditorFocus } from "../ui/focus";
import type { BlockRuleTarget } from "./types";

/** @param editor - Canonical selection owner. @returns The single wholly selected rule, including selection from the block rail. */
export function captureBlockRule(editor: Editor): BlockRuleTarget | null {
  const { doc, selection } = editor.state.pm;
  const node = doc.nodeAt(selection.from);
  return node?.type.name === "horizontalRule" && selection.to === selection.from + node.nodeSize
    ? { doc, pos: selection.from, node } : null;
}

/** @param editor - Command owner. @param target - Original control target. @param style - Partial canonical style, or null for deletion. @returns Whether the source still owns this edit. */
export function changeBlockRule(editor: Editor, target: BlockRuleTarget, style: HorizontalRuleStyleInput | null): boolean {
  if (editor.isDestroyed || !editor.isEditable) return false;
  const current = captureBlockRule(editor);
  if (!current || current.doc !== target.doc || current.node !== target.node || current.pos !== target.pos) return false;
  const chain = editor.chain().closeHistory();
  const changed = style === null ? chain.deleteSelection().run() : chain.updateHorizontalRule(style).run();
  if (changed) { editor.commands.closeHistory(); restoreBlockEditorFocus(editor); }
  return changed;
}
