import type { CommandProps } from "@quirekit/core";

/**
 * Handles Tab after form, table and list handlers declined it.
 *
 * A selection inside one textblock is replaced by a tab character; a selection
 * across paragraphs increases their indentation.
 *
 * @param context - Keyboard command context.
 * @param types - Textblock node names that receive Word paragraph behavior.
 * @returns Whether the key was consumed.
 */
export function handleWordParagraphTab(
  context: CommandProps,
  types: readonly string[]
): boolean {
  const { $from, $to } = context.state.selection;
  if (!context.editor.isEditable || !types.includes($from.parent.type.name)) return false;
  if (!$from.sameParent($to)) return context.commands.increaseWordParagraphIndentation();
  return context.commands.insertContent("\t");
}

/**
 * Handles Shift+Tab after form, table and list handlers declined it.
 *
 * Only a selection across paragraphs is consumed, so a caret keeps the browser's
 * reverse focus navigation as a keyboard exit from the editor.
 *
 * @param context - Keyboard command context.
 * @param types - Textblock node names that receive Word paragraph behavior.
 * @returns Whether the key was consumed.
 */
export function handleWordParagraphShiftTab(
  context: CommandProps,
  types: readonly string[]
): boolean {
  const { $from, $to } = context.state.selection;
  if (!context.editor.isEditable || !types.includes($from.parent.type.name)) return false;
  return $from.sameParent($to) ? false : context.commands.decreaseWordParagraphIndentation();
}
