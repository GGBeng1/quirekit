import { Plugin, PluginKey, Selection } from "@quirekit/pm";
import { QuireCommandManager } from "../CommandManager";
import {
  clearNodes,
  createParagraphNear,
  deleteCurrentNode,
  deleteSelection,
  exitCode,
  joinBackward,
  joinForward,
  liftEmptyBlock,
  newlineInCode,
  selectAll,
  selectNodeBackward,
  selectNodeForward,
  selectTextblockEnd,
  selectTextblockStart,
  splitBlock,
  undoInputRule
} from "../commands/core-commands";
import { Extension } from "../extension";
import { createChainableState, isNodeEmpty } from "../helpers";
import { isMacOS, isiOS } from "../utilities";
import type { Command, CommandProps } from "../types";

/** Tiptap-compatible keymap extension. */
export const Keymap = Extension.create({
  name: "keymap",

  /**
   * Creates default editing keyboard shortcuts.
   *
   * @returns Keyboard shortcut handlers keyed by ProseMirror key names.
   */
  addKeyboardShortcuts() {
    const handleBackspace: Command = (context) =>
      runFirstCommand(context, [
        undoInputRule(),
        maybeClearFirstTextblock,
        deleteSelection(),
        joinBackward(),
        selectNodeBackward()
      ]);

    const handleDelete: Command = (context) =>
      runFirstCommand(context, [
        deleteSelection(),
        deleteCurrentNode(),
        joinForward(),
        selectNodeForward()
      ]);

    const handleEnter: Command = (context) =>
      runFirstCommand(context, [
        newlineInCode(),
        createParagraphNear(),
        liftEmptyBlock(),
        splitBlock()
      ]);

    const baseKeymap: Record<string, Command> = {
      Enter: handleEnter,
      "Mod-Enter": exitCode(),
      Backspace: handleBackspace,
      "Mod-Backspace": handleBackspace,
      "Shift-Backspace": handleBackspace,
      Delete: handleDelete,
      "Mod-Delete": handleDelete,
      "Mod-a": selectAll()
    };

    if (isiOS() || isMacOS()) {
      return {
        ...baseKeymap,
        "Ctrl-h": handleBackspace,
        "Alt-Backspace": handleBackspace,
        "Ctrl-d": handleDelete,
        "Ctrl-Alt-Backspace": handleDelete,
        "Alt-Delete": handleDelete,
        "Alt-d": handleDelete,
        "Ctrl-a": selectTextblockStart(),
        "Ctrl-e": selectTextblockEnd()
      };
    }

    return baseKeymap;
  },

  /**
   * Creates the clear-document append transaction plugin.
   *
   * @returns Plugin list containing the clear-document plugin.
   */
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("clearDocument"),
        appendTransaction: (transactions, oldState, newState) => {
          if (!editor || transactions.some((transaction) => transaction.getMeta("composition"))) {
            return;
          }

          const docChanges =
            transactions.some((transaction) => transaction.docChanged) &&
            !oldState.doc.eq(newState.doc);
          const ignoreTransaction = transactions.some((transaction) =>
            transaction.getMeta("preventClearDocument")
          );

          if (!docChanges || ignoreTransaction) {
            return;
          }

          const { empty, from, to } = oldState.selection;
          const allFrom = Selection.atStart(oldState.doc).from;
          const allEnd = Selection.atEnd(oldState.doc).to;
          const allWasSelected = from === allFrom && to === allEnd;

          if (empty || !allWasSelected || !isNodeEmpty(newState.doc)) {
            return;
          }

          const tr = newState.tr;
          const state = createChainableState({ state: newState, transaction: tr });
          const { commands } = new QuireCommandManager({ editor, state });

          commands.clearNodes();

          if (tr.steps.length === 0) {
            return;
          }

          return tr;
        }
      })
    ];
  }
});

/**
 * Runs commands until one handles the current shortcut.
 *
 * @param context - Command execution context shared by the shortcut.
 * @param commands - Commands to try in order.
 * @returns Whether one command handled the shortcut.
 */
function runFirstCommand(
  context: CommandProps,
  commands: readonly Command[]
): boolean {
  return commands.some((command) => command(context));
}

/**
 * Converts the first empty textblock back to the default node when needed.
 *
 * @param context - Command execution context.
 * @returns Whether the block was cleared.
 */
function maybeClearFirstTextblock(context: CommandProps): boolean {
  const { selection, doc } = context.tr;
  const { empty, $anchor } = selection;
  const { pos, parent } = $anchor;
  const $parentPos =
    $anchor.parent.isTextblock && pos > 0 ? context.tr.doc.resolve(pos - 1) : $anchor;
  const parentIsIsolating = Boolean($parentPos.parent.type.spec.isolating);
  const parentPos = $anchor.pos - $anchor.parentOffset;
  const isAtStart =
    parentIsIsolating && $parentPos.parent.childCount === 1
      ? parentPos === $anchor.pos
      : Selection.atStart(doc).from === pos;

  if (
    !empty ||
    !parent.type.isTextblock ||
    parent.textContent.length > 0 ||
    !isAtStart ||
    (isAtStart && $anchor.parent.type.name === "paragraph")
  ) {
    return false;
  }

  return clearNodes()(context);
}
