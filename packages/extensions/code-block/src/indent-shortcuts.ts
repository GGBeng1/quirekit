import type { CommandProps } from "@quirekit/core";
import {
  TextSelection,
  type Node as PMNode,
  type Transaction
} from "@quirekit/pm";

/** Options for code block indentation handlers. */
export interface CodeBlockIndentOptions {
  /** Shortcut command context. */
  readonly context: CommandProps;
  /** Code block node name. */
  readonly nodeName: string;
  /** Whether indentation shortcuts are enabled. */
  readonly enabled: boolean | null | undefined;
  /** Number of spaces per indentation level. */
  readonly tabSize: number;
}

/**
 * Handles Tab indentation inside code blocks.
 *
 * @param options - Indentation handler options.
 * @returns Whether the shortcut handled the key.
 */
export function handleCodeBlockIndent(options: CodeBlockIndentOptions): boolean {
  if (!options.enabled) {
    return false;
  }

  const { editor, tr, dispatch, commands } = options.context;
  const { selection } = editor.state.pm;
  const { $from, empty } = selection;

  if ($from.parent.type.name !== options.nodeName) {
    return false;
  }

  const indent = " ".repeat(options.tabSize);

  if (empty) {
    return commands.insertContent(indent);
  }

  const { from, to } = selection;
  const text = tr.doc.textBetween(from, to, "\n", "\n");
  const indentedText = text
    .split("\n")
    .map((line) => indent + line)
    .join("\n");

  tr.replaceWith(from, to, tr.doc.type.schema.text(indentedText));
  dispatch?.(tr);
  return true;
}

/**
 * Handles Shift-Tab reverse indentation inside code blocks.
 *
 * @param options - Indentation handler options.
 * @returns Whether the shortcut handled the key.
 */
export function handleCodeBlockReverseIndent(
  options: CodeBlockIndentOptions
): boolean {
  if (!options.enabled) {
    return false;
  }

  const { editor, tr, dispatch } = options.context;
  const { selection } = editor.state.pm;
  const { $from, empty } = selection;

  if ($from.parent.type.name !== options.nodeName) {
    return false;
  }

  if (empty) {
    removeIndentFromCurrentLine(tr, tr.doc, $from.pos, options.tabSize);
    dispatch?.(tr);
    return true;
  }

  const { from, to } = selection;
  const text = tr.doc.textBetween(from, to, "\n", "\n");
  const reverseIndentedText = text
    .split("\n")
    .map((line) => removeLeadingSpaces(line, options.tabSize))
    .join("\n");

  tr.replaceWith(from, to, tr.doc.type.schema.text(reverseIndentedText));
  dispatch?.(tr);
  return true;
}

/**
 * Removes indentation from the current logical line.
 *
 * @param tr - Transaction to mutate.
 * @param doc - Document being edited.
 * @param cursorPosition - Cursor position inside the code block.
 * @param tabSize - Maximum number of spaces to remove.
 */
function removeIndentFromCurrentLine(
  tr: Transaction,
  doc: PMNode,
  cursorPosition: number,
  tabSize: number
): void {
  const $cursor = doc.resolve(cursorPosition);
  const codeBlockStart = $cursor.start();
  const codeBlockEnd = $cursor.end();
  const allText = doc.textBetween(codeBlockStart, codeBlockEnd, "\n", "\n");
  const lines = allText.split("\n");
  const relativeCursorPos = cursorPosition - codeBlockStart;
  let currentLineIndex = 0;
  let charCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (charCount + line.length >= relativeCursorPos) {
      currentLineIndex = index;
      break;
    }

    charCount += line.length + 1;
  }

  const currentLine = lines[currentLineIndex] ?? "";
  const spacesToRemove = countRemovableLeadingSpaces(currentLine, tabSize);

  if (spacesToRemove === 0) {
    return;
  }

  let lineStartPosition = codeBlockStart;

  for (let index = 0; index < currentLineIndex; index += 1) {
    lineStartPosition += (lines[index] ?? "").length + 1;
  }

  tr.delete(lineStartPosition, lineStartPosition + spacesToRemove);

  const cursorPositionInLine = cursorPosition - lineStartPosition;

  if (cursorPositionInLine <= spacesToRemove) {
    tr.setSelection(TextSelection.create(tr.doc, lineStartPosition));
  }
}

/**
 * Removes up to `tabSize` leading spaces from one line.
 *
 * @param line - Line to unindent.
 * @param tabSize - Maximum number of spaces to remove.
 * @returns Unindented line.
 */
function removeLeadingSpaces(line: string, tabSize: number): string {
  return line.slice(countRemovableLeadingSpaces(line, tabSize));
}

/**
 * Counts removable leading spaces for one line.
 *
 * @param line - Line to inspect.
 * @param tabSize - Maximum number of spaces to remove.
 * @returns Number of leading spaces that can be removed.
 */
function countRemovableLeadingSpaces(line: string, tabSize: number): number {
  const leadingSpaces = line.match(/^ */)?.[0] || "";

  return Math.min(leadingSpaces.length, tabSize);
}
