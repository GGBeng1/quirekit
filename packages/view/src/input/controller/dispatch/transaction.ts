import type { Transaction } from "@quirekit/pm";
import type { QuireEditorInputResult } from "../../types";
import { captureQuireInputResult } from "../input-result";
import type { QuireEditorInputControllerRuntime } from "../runtime";
import { isQuireTransactionInsideStoryCommandBoundary } from "../../story-boundary";

/**
 * Dispatches a transaction while applying temporary composition metadata.
 *
 * @param runtime - Shared input-controller runtime.
 * @param transaction - PM transaction to dispatch.
 */
export function dispatchQuireControllerTransaction(
  runtime: QuireEditorInputControllerRuntime,
  transaction: Transaction
): void {
  const storyCommandBoundary = runtime.resolveStoryCommandBoundary();

  if (
    storyCommandBoundary !== null &&
    !isQuireTransactionInsideStoryCommandBoundary(
      transaction,
      storyCommandBoundary
    )
  ) {
    return;
  }

  const compositionId = runtime.composition.dispatchCompositionId;

  if (compositionId !== null) {
    transaction.setMeta("composition", compositionId);
  }

  runtime.editor.dispatchTransaction(transaction);
}

/**
 * Runs an input mutation and summarizes its effect.
 *
 * @param runtime - Shared input-controller runtime.
 * @param dispatch - Function that may apply editor transactions.
 * @param compositionId - Optional PM composition id to tag dispatched transactions.
 * @returns Input result describing handling and document changes.
 */
export function captureQuireControllerInputResult(
  runtime: QuireEditorInputControllerRuntime,
  dispatch: () => boolean,
  compositionId?: number
): QuireEditorInputResult {
  return captureQuireInputResult({
    editor: runtime.editor,
    composition: runtime.composition,
    dispatch,
    compositionId
  });
}
