import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireEditorInputBindingOptions } from "../types";

/**
 * Creates a transient IME preedit from the editor's current selection.
 *
 * @param options - Mounted input binding options with the active editor.
 * @param preeditText - Visible preedit text reported by the IME engine.
 * @returns IME preedit for the current selection, or undefined when empty.
 */
export function createQuireImePreedit(
  options: QuireEditorInputBindingOptions,
  preeditText: string
): QuireImePreedit | undefined {
  if (preeditText.length === 0) {
    return undefined;
  }

  const { selection } = options.editor.state.pm;

  return {
    range: { from: selection.from, to: selection.to },
    text: preeditText
  };
}
