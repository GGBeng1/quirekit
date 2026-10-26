import type { QuireEditorInputBindingOptions } from "../types";

/**
 * Reads the live editability authority for one mounted input binding.
 *
 * Mounted views provide the combined editor, status, and plugin result. Direct
 * binding consumers fall back to the editor option so the callback remains a
 * compatible refinement of the public input contract.
 *
 * @param options - Input binding options with editor and optional view authority.
 * @returns Whether browser editing events may enter the input pipeline.
 */
export function readQuireMountedInputEditable(
  options: QuireEditorInputBindingOptions
): boolean {
  return options.readEditable?.() ?? options.editor.isEditable;
}
