import type {
  QuireImeCompositionEvent,
  QuireImeEventResult
} from "../types";
import { createQuireImeResult } from "./result";
import type { QuireImeEngineRuntime } from "./runtime";
import {
  rememberQuireImeInputValue,
  resetQuireImeCompositionState
} from "./state";
import {
  readQuireImeCompositionCommitText,
  readQuireImeCompositionText,
  readQuireImeEventText
} from "./text";

/**
 * Starts a browser composition session without mutating the document.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser composition start payload.
 * @returns IME state update for the host surface.
 */
export function handleQuireImeCompositionStart(
  runtime: QuireImeEngineRuntime,
  event: QuireImeCompositionEvent = {}
): QuireImeEventResult {
  runtime.state.composing = true;
  runtime.state.compositionBaseInputValue = runtime.state.lastInputValue;
  runtime.state.preeditText = readQuireImeCompositionText(
    event,
    runtime.state.compositionBaseInputValue,
    readQuireImeEventText(event)
  );
  rememberQuireImeInputValue(runtime.state, event.inputValue);
  runtime.state.lastCompositionCommit = null;

  return createQuireImeResult(runtime.state, {
    handledByIme: true,
    preserveInput: true
  });
}

/**
 * Updates the visible preedit text for an active composition session.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser composition update payload.
 * @returns IME state update for the host surface.
 */
export function handleQuireImeCompositionUpdate(
  runtime: QuireImeEngineRuntime,
  event: QuireImeCompositionEvent
): QuireImeEventResult {
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

/**
 * Finalizes the current composition session and returns text to commit once.
 *
 * @param runtime - Engine runtime services.
 * @param event - Browser composition end payload.
 * @returns IME commit result for the host surface.
 */
export function handleQuireImeCompositionEnd(
  runtime: QuireImeEngineRuntime,
  event: QuireImeCompositionEvent
): QuireImeEventResult {
  const commitText = readQuireImeCompositionCommitText(
    event,
    runtime.state.compositionBaseInputValue
  );
  const timestamp = runtime.now();

  resetQuireImeCompositionState(runtime.state);
  runtime.state.lastCompositionEndAt = timestamp;

  if (commitText.length === 0) {
    runtime.state.lastCompositionCommit = null;
    return createQuireImeResult(runtime.state, {
      handledByIme: true,
      clearInput: true
    });
  }

  runtime.state.lastCompositionCommit = {
    text: commitText,
    timestamp
  };

  return createQuireImeResult(runtime.state, {
    handledByIme: true,
    clearInput: true,
    commitText
  });
}
