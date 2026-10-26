import type { QuireImeEventResult } from "../types";
import type { QuireImeEngineState } from "./state";

/**
 * Builds a normalized engine result with stable default fields.
 *
 * @param state - Current IME state.
 * @param partial - Result fields that differ from defaults.
 * @returns Normalized IME result.
 */
export function createQuireImeResult(
  state: QuireImeEngineState,
  partial: Partial<QuireImeEventResult> = {}
): QuireImeEventResult {
  return {
    handledByIme: partial.handledByIme ?? false,
    preventDefault: partial.preventDefault ?? false,
    clearInput: partial.clearInput ?? false,
    preserveInput: partial.preserveInput ?? false,
    commitText: partial.commitText,
    preeditText: state.preeditText,
    isComposing: state.composing,
    duplicateCommit: partial.duplicateCommit
  };
}
