import { TextSelection } from "@quirekit/pm";
import { resolveGraphemeDeleteRange } from "./grapheme";
import type { DeleteDirection, DispatchCanvasFallbackKeyOptions } from "./types";

/**
 * Deletes an explicit selection, a text grapheme, or a non-text document unit.
 * @param options - Editor and transaction dispatcher.
 * @param direction - Logical deletion direction.
 * @returns Whether deletion was applied.
 */
export function dispatchFallbackDelete(
  options: DispatchCanvasFallbackKeyOptions,
  direction: DeleteDirection
): boolean {
  const { selection, doc, tr } = options.editor.state.pm;
  if (!selection.empty) {
    options.dispatchTransaction(tr.deleteSelection());
    return true;
  }

  // PM/feature keymaps already handled structural ownership. Widen only text
  // deletion to a complete cluster, preserving explicit selection semantics.
  const range = selection instanceof TextSelection
    ? resolveGraphemeDeleteRange(selection.$from, direction)
    : null;
  if (range) {
    options.dispatchTransaction(tr.delete(range.from, range.to));
    return true;
  }

  if (direction === "backward") {
    if (selection.from <= 1) return false;
    options.dispatchTransaction(tr.delete(selection.from - 1, selection.from));
  } else {
    if (selection.from >= doc.content.size) return false;
    options.dispatchTransaction(tr.delete(selection.from, selection.from + 1));
  }
  return true;
}
