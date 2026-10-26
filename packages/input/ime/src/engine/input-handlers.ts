import type {
  QuireImeBeforeInputEvent,
  QuireImeEventResult,
  QuireImeInputEvent,
  QuireImeKeyboardEvent
} from "../types";
import {
  consumeDuplicateQuireImeCompositionCommit,
  isQuireImeCompositionBeforeInput,
  readQuireImeBeforeInputCommitText,
  recordQuireImeCompositionCommit,
  shouldCommitQuireImeInputDuringComposition,
  shouldGuardQuireImePostCompositionKey,
  shouldReleaseQuireImeEmptySessionForKey
} from "./guards";
import { handleQuireImeCompositionEnd } from "./composition-handlers";
import { createQuireImeResult } from "./result";
import type { QuireImeEngineRuntime } from "./runtime";
import {
  rememberQuireImeInputValue,
  resetQuireImeCompositionState
} from "./state";
import { readQuireImeCompositionText } from "./text";

/**
 * Handles a browser beforeinput event before normal editor mutation logic.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser beforeinput payload.
 * @returns IME handling result for the host surface.
 */
export function handleQuireImeBeforeInput(
  runtime: QuireImeEngineRuntime,
  event: QuireImeBeforeInputEvent
): QuireImeEventResult {
  if (
    consumeDuplicateQuireImeCompositionCommit(
      runtime.state,
      event,
      runtime.now(),
      runtime.dedupeWindowMs
    )
  ) {
    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      preventDefault: true,
      clearInput: true,
      duplicateCommit: true
    });
  }

  if (isQuireImeCompositionBeforeInput(runtime.state, event)) {
    runtime.state.composing = true;
    runtime.state.preeditText = readQuireImeCompositionText(
      event,
      runtime.state.compositionBaseInputValue,
      runtime.state.preeditText
    );
    rememberQuireImeInputValue(runtime.state, event.inputValue);

    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      preserveInput: true
    });
  }

  if (event.inputType === "insertFromComposition") {
    return handleInsertFromCompositionBeforeInput(runtime, event);
  }

  return createQuireImeResult(runtime.state, {
    clearInput: true
  });
}

/**
 * Handles keyboard events that belong to active or recently ended IME sessions.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser keyboard payload.
 * @returns IME handling result for the host surface.
 */
export function handleQuireImeKeyDown(
  runtime: QuireImeEngineRuntime,
  event: QuireImeKeyboardEvent
): QuireImeEventResult {
  if (shouldReleaseQuireImeEmptySessionForKey(runtime.state, event)) {
    resetQuireImeCompositionState(runtime.state);
    return createQuireImeResult(runtime.state);
  }

  if (runtime.state.composing || event.isComposing === true || event.keyCode === 229) {
    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      preserveInput: true
    });
  }

  if (
    shouldGuardQuireImePostCompositionKey(
      runtime.state,
      event,
      runtime.now(),
      runtime.postCompositionKeyGuardMs
    )
  ) {
    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      preventDefault: true,
      clearInput: true
    });
  }

  return createQuireImeResult(runtime.state);
}

/**
 * Handles browser input events after the input host value has changed.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser input payload.
 * @returns IME handling result for the host surface.
 */
export function handleQuireImeInput(
  runtime: QuireImeEngineRuntime,
  event: QuireImeInputEvent
): QuireImeEventResult {
  if (runtime.state.composing || event.isComposing === true) {
    if (shouldCommitQuireImeInputDuringComposition(runtime.state, event)) {
      return handleQuireImeCompositionEnd(runtime, {
        ...(event.data === undefined ? {} : { data: event.data }),
        ...(event.inputValue === undefined ? {} : { inputValue: event.inputValue })
      });
    }

    runtime.state.preeditText = readQuireImeCompositionText(
      event,
      runtime.state.compositionBaseInputValue,
      runtime.state.preeditText
    );
    rememberQuireImeInputValue(runtime.state, event.inputValue);

    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      preserveInput: true
    });
  }

  return createQuireImeResult(runtime.state, {
    clearInput: true
  });
}

/**
 * Clears transient IME state when the input host loses focus.
 *
 * @param runtime - Engine runtime services.
 * @returns IME reset result for the host surface.
 */
export function handleQuireImeBlur(
  runtime: QuireImeEngineRuntime
): QuireImeEventResult {
  resetQuireImeCompositionState(runtime.state);
  runtime.state.lastCompositionCommit = null;
  runtime.state.lastCompositionEndAt = null;

  return createQuireImeResult(runtime.state, {
    handledByIme: true,
    clearInput: true
  });
}

/**
 * Handles an insertFromComposition beforeinput commit.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser beforeinput payload.
 * @returns IME handling result.
 */
function handleInsertFromCompositionBeforeInput(
  runtime: QuireImeEngineRuntime,
  event: QuireImeBeforeInputEvent
): QuireImeEventResult {
  const commitText = readQuireImeBeforeInputCommitText(event);

  if (commitText.length === 0) {
    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      preventDefault: true,
      clearInput: true
    });
  }

  recordQuireImeCompositionCommit(runtime.state, commitText, runtime.now());
  return createQuireImeResult(runtime.state, {
    handledByIme: true,
    preventDefault: true,
    clearInput: true,
    commitText
  });
}
