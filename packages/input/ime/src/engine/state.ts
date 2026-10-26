/** Recently committed composition text used to suppress duplicate browser events. */
export interface RecentCompositionCommit {
  /** Finalized text committed by the engine. */
  readonly text: string;
  /** Timestamp when the commit was recorded. */
  readonly timestamp: number;
}

/** Mutable state tracked by the IME input engine. */
export interface QuireImeEngineState {
  /** Whether a browser composition session is active. */
  composing: boolean;
  /** Current visible preedit text. */
  preeditText: string;
  /** Input value captured before composition started. */
  compositionBaseInputValue: string;
  /** Last observed input-host value. */
  lastInputValue: string;
  /** Recent commit used for duplicate suppression. */
  lastCompositionCommit: RecentCompositionCommit | null;
  /** Timestamp for the last composition end event. */
  lastCompositionEndAt: number | null;
}

/**
 * Creates an initial mutable IME state object.
 *
 * @returns Fresh IME engine state.
 */
export function createQuireImeEngineState(): QuireImeEngineState {
  return {
    composing: false,
    preeditText: "",
    compositionBaseInputValue: "",
    lastInputValue: "",
    lastCompositionCommit: null,
    lastCompositionEndAt: null
  };
}

/**
 * Resets active composition fields after commit, cancel, or blur.
 *
 * @param state - Mutable IME state.
 * @returns Nothing.
 */
export function resetQuireImeCompositionState(state: QuireImeEngineState): void {
  state.composing = false;
  state.preeditText = "";
  state.compositionBaseInputValue = "";
  state.lastInputValue = "";
}

/**
 * Remembers the browser input-host value for the next composition diff base.
 *
 * @param state - Mutable IME state.
 * @param inputValue - Current textarea/contenteditable value from the host.
 * @returns Nothing.
 */
export function rememberQuireImeInputValue(
  state: QuireImeEngineState,
  inputValue: string | null | undefined
): void {
  if (inputValue === null || inputValue === undefined) {
    return;
  }

  state.lastInputValue = inputValue;
}
