import {
  isAtStartOfNode,
  isNodeActive,
  type QuireEditor,
  type CommandProps
} from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";
import { findListItemPos } from "./find-list-item-pos";
import { hasListBefore, hasListItemBefore } from "./has";
import { listItemHasSubList } from "./list-item-has-sub-list";

/**
 * Handles Backspace list behavior before the base keymap runs.
 *
 * @param editor - Editor that owns the document.
 * @param name - List item node type name.
 * @param parentListTypes - List wrapper node names.
 * @param context - Existing shortcut transaction, when called by the keymap.
 * @returns Whether Backspace was handled.
 */
export function handleBackspace(
  editor: QuireEditor,
  name: string,
  parentListTypes: readonly string[],
  context?: CommandProps
): boolean {
  // The keymap already owns a transaction. A declined input-rule undo must
  // not publish an empty root transaction before the next handler runs.
  const undone = context ? context.commands.undoInputRule()
    : editor.can().undoInputRule() && editor.commands.undoInputRule();
  if (undone) {
    return true;
  }

  if (editor.state.pm.selection.from !== editor.state.pm.selection.to) {
    return false;
  }

  if (
    !isNodeActive(editor.state.pm, name) &&
    hasListBefore(editor.state.pm, name, parentListTypes)
  ) {
    return moveParagraphIntoPreviousList(editor, name);
  }

  if (!isNodeActive(editor.state.pm, name) || !isAtStartOfNode(editor.state.pm)) {
    return false;
  }

  const listItemPos = findListItemPos(name, editor.state.pm);

  if (!listItemPos) {
    return false;
  }

  const $prev = editor.state.pm.doc.resolve(listItemPos.$pos.pos - 2);
  const prevNode = $prev.node(listItemPos.depth);
  const previousListItemHasSubList = listItemHasSubList(name, editor.state.pm, prevNode);

  if (hasListItemBefore(name, editor.state.pm) && !previousListItemHasSubList) {
    return editor.commands.joinItemBackward();
  }

  return editor.chain().liftListItem(name).run();
}

/**
 * Moves the current paragraph into the previous list when Backspace joins them.
 *
 * @param editor - Editor that owns the document.
 * @param name - List item node type name.
 * @returns Whether the document was changed.
 */
function moveParagraphIntoPreviousList(editor: QuireEditor, name: string): boolean {
  const { $anchor } = editor.state.pm.selection;
  const $listPos = editor.state.pm.doc.resolve($anchor.before() - 1);
  const listDescendants: Array<{ node: PMNode; pos: number }> = [];

  $listPos.node().descendants((node, pos) => {
    if (node.type.name === name) {
      listDescendants.push({ node, pos });
    }
  });

  const lastItem = listDescendants.at(-1);

  if (!lastItem) {
    return false;
  }

  const $lastItemPos = editor.state.pm.doc.resolve($listPos.start() + lastItem.pos + 1);

  return editor
    .chain()
    .cut({ from: $anchor.start() - 1, to: $anchor.end() + 1 }, $lastItemPos.end())
    .joinForward()
    .run();
}
