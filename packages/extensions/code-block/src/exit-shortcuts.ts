import type { CommandProps } from "@quirekit/core";
import { Selection } from "@quirekit/pm";

/** Options for code block exit shortcut handlers. */
export interface CodeBlockExitOptions {
  /** Shortcut command context. */
  readonly context: CommandProps;
  /** Code block node name. */
  readonly nodeName: string;
  /** Whether this exit shortcut is enabled. */
  readonly enabled: boolean | null | undefined;
}

/**
 * Handles triple Enter at the end of a code block.
 *
 * @param options - Exit handler options.
 * @returns Whether the shortcut handled the key.
 */
export function handleCodeBlockTripleEnter(
  options: CodeBlockExitOptions
): boolean {
  if (!options.enabled) {
    return false;
  }

  const { editor, tr, commands } = options.context;
  const { selection } = editor.state.pm;
  const { $from, empty } = selection;

  if (!empty || $from.parent.type.name !== options.nodeName) {
    return false;
  }

  const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
  const endsWithDoubleNewline = $from.parent.textContent.endsWith("\n\n");

  if (!isAtEnd || !endsWithDoubleNewline) {
    return false;
  }

  tr.delete($from.pos - 2, $from.pos);
  return commands.exitCode();
}

/**
 * Handles ArrowDown at the end of the final code block.
 *
 * @param options - Exit handler options.
 * @returns Whether the shortcut handled the key.
 */
export function handleCodeBlockArrowDown(options: CodeBlockExitOptions): boolean {
  if (!options.enabled) {
    return false;
  }

  const { editor, tr, dispatch, commands } = options.context;
  const { selection } = editor.state.pm;
  const { $from, empty } = selection;

  if (!empty || $from.parent.type.name !== options.nodeName) {
    return false;
  }

  const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;

  if (!isAtEnd) {
    return false;
  }

  const after = $from.after();
  const nodeAfter = editor.state.pm.doc.resolve(after).nodeAfter;

  if (nodeAfter) {
    tr.setSelection(Selection.near(tr.doc.resolve(after)));
    dispatch?.(tr);
    return true;
  }

  return commands.exitCode();
}
