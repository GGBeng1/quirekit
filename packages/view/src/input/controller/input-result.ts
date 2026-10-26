import type { QuireEditor } from "@quirekit/core";
import type { QuireEditorInputResult } from "../types";
import type { QuireInputCompositionState } from "./composition-state";

/** Options used to capture the result of an input mutation. */
export interface CaptureCanvasInputResultOptions {
  /** Editor whose document may change during dispatch. */
  readonly editor: QuireEditor;
  /** Composition state used to tag PM transactions. */
  readonly composition: QuireInputCompositionState;
  /**
   * Function that may apply editor transactions.
   *
   * @returns Whether the input was handled.
   */
  readonly dispatch: () => boolean;
  /** Optional PM composition id to tag dispatched transactions. */
  readonly compositionId?: number | undefined;
}

/**
 * Runs an input mutation and summarizes its effect.
 *
 * @param options - Editor, composition state, and mutation callback.
 * @returns Input result describing handling and document changes.
 */
export function captureQuireInputResult(
  options: CaptureCanvasInputResultOptions
): QuireEditorInputResult {
  const beforeDoc = options.editor.state.doc;
  const previousCompositionId = options.composition.beginDispatch(
    options.compositionId
  );

  try {
    const handled = options.dispatch();

    return {
      handled,
      docChanged: beforeDoc !== options.editor.state.doc
    };
  } finally {
    options.composition.restoreDispatch(previousCompositionId);
  }
}
