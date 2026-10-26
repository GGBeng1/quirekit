import type { CommandProps, QuireKeyboardShortcutMap } from "@quirekit/core";
import {
  handleCodeBlockArrowDown,
  handleCodeBlockTripleEnter
} from "./exit-shortcuts";
import {
  handleCodeBlockIndent,
  handleCodeBlockReverseIndent
} from "./indent-shortcuts";
import { DEFAULT_TAB_SIZE, type CodeBlockOptions } from "./types";

/** Options used to create code block keyboard shortcuts. */
export interface CodeBlockKeyboardShortcutOptions {
  /** Editor exposed by the extension runtime context. */
  readonly editor: CommandProps["editor"] | undefined;
  /** Code block node name. */
  readonly nodeName: string;
  /** Resolved code block extension options. */
  readonly extensionOptions: Readonly<CodeBlockOptions>;
}

/**
 * Creates keyboard shortcuts owned by the code block extension.
 *
 * @param options - Shortcut creation options.
 * @returns Keyboard shortcut handlers keyed by ProseMirror key names.
 */
export function createCodeBlockKeyboardShortcuts(
  options: CodeBlockKeyboardShortcutOptions
): QuireKeyboardShortcutMap {
  return {
    "Mod-Alt-c": () => options.editor?.commands.toggleCodeBlock() ?? false,
    Backspace: () => handleCodeBlockBackspace(options.editor, options.nodeName),
    Tab: (context: CommandProps) =>
      handleCodeBlockIndent({
        context,
        nodeName: options.nodeName,
        enabled: options.extensionOptions.enableTabIndentation,
        tabSize: options.extensionOptions.tabSize ?? DEFAULT_TAB_SIZE
      }),
    "Shift-Tab": (context: CommandProps) =>
      handleCodeBlockReverseIndent({
        context,
        nodeName: options.nodeName,
        enabled: options.extensionOptions.enableTabIndentation,
        tabSize: options.extensionOptions.tabSize ?? DEFAULT_TAB_SIZE
      }),
    Enter: (context: CommandProps) =>
      handleCodeBlockTripleEnter({
        context,
        nodeName: options.nodeName,
        enabled: options.extensionOptions.exitOnTripleEnter
      }),
    ArrowDown: (context: CommandProps) =>
      handleCodeBlockArrowDown({
        context,
        nodeName: options.nodeName,
        enabled: options.extensionOptions.exitOnArrowDown
      })
  };
}

/**
 * Handles backspace at the start of, or inside an empty, code block.
 *
 * @param editor - Editor exposed by the code block extension context.
 * @param nodeName - Code block node name.
 * @returns Whether the shortcut handled the key.
 */
function handleCodeBlockBackspace(
  editor: CommandProps["editor"] | undefined,
  nodeName: string
): boolean {
  if (!editor) {
    return false;
  }

  const { empty, $anchor } = editor.state.pm.selection;
  const isAtStart = $anchor.pos === 1;

  if (!empty || $anchor.parent.type.name !== nodeName) {
    return false;
  }

  return isAtStart || !$anchor.parent.textContent.length
    ? editor.commands.clearNodes()
    : false;
}
