import {
  isAtEndOfNode,
  isNodeActive,
  type QuireEditor
} from "@quirekit/core";
import { nextListIsDeeper } from "./next-list-is-deeper";
import { nextListIsHigher } from "./next-list-is-higher";

/**
 * Handles Delete list behavior before the base keymap runs.
 *
 * @param editor - Editor that owns the document.
 * @param name - List item node type name.
 * @returns Whether Delete was handled.
 */
export function handleDelete(editor: QuireEditor, name: string): boolean {
  if (!isNodeActive(editor.state.pm, name)) {
    return false;
  }

  if (!isAtEndOfNode(editor.state.pm, name)) {
    return false;
  }

  const { selection } = editor.state.pm;
  const { $from, $to } = selection;

  if (!selection.empty && $from.sameParent($to)) {
    return false;
  }

  if (nextListIsDeeper(name, editor.state.pm)) {
    return editor
      .chain()
      .focus(editor.state.pm.selection.from + 4)
      .lift(name)
      .joinBackward()
      .run();
  }

  if (nextListIsHigher(name, editor.state.pm)) {
    return editor.chain().joinForward().joinBackward().run();
  }

  return editor.commands.joinItemForward();
}
