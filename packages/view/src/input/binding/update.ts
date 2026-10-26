import type {
  QuireEditorInputBindingSource,
  QuireEditorInputBindingUpdate,
  QuireEditorInputResult
} from "../types";

/**
 * Creates an input binding update summary from an input controller result.
 *
 * @param source - Browser input source that produced the update.
 * @param result - Result returned by the input controller.
 * @returns Mounted input update summary.
 */
export function createInputBindingUpdate(
  source: QuireEditorInputBindingSource,
  result: QuireEditorInputResult
): QuireEditorInputBindingUpdate {
  return {
    source,
    result,
    reason: result.docChanged ? "transaction" : "selection"
  };
}
