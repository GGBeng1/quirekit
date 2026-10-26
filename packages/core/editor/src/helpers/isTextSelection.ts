import { TextSelection } from "@quirekit/pm";

/**
 * Reports whether a value is a ProseMirror text selection.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a text selection.
 */
export function isTextSelection(value: unknown): value is TextSelection {
  return value instanceof TextSelection;
}
