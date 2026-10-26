import type {
  QuireImeBeforeInputEvent,
  QuireImeInputEvent,
  QuireImeKeyboardEvent
} from "../types";
import {
  resetQuireImeCompositionState,
  type QuireImeEngineState
} from "./state";
import {
  readQuireImeCompositionCommitText,
  readQuireImeEventText
} from "./text";

/**
 * Checks whether a beforeinput event is part of a browser composition session.
 *
 * @param state - Current IME state.
 * @param event - Browser beforeinput payload.
 * @returns Whether the event should bypass normal document mutation logic.
 */
export function isQuireImeCompositionBeforeInput(
  state: QuireImeEngineState,
  event: QuireImeBeforeInputEvent
): boolean {
  return (
    state.composing ||
    event.isComposing === true ||
    event.inputType === "insertCompositionText" ||
    event.inputType === "deleteCompositionText"
  );
}

/**
 * Checks whether an input event is the final IME commit when compositionend is missing.
 *
 * @param state - Current IME state.
 * @param event - Browser input payload.
 * @returns Whether the input value should be committed as finalized text.
 */
export function shouldCommitQuireImeInputDuringComposition(
  state: QuireImeEngineState,
  event: QuireImeInputEvent
): boolean {
  if (!state.composing || event.isComposing === true) {
    return false;
  }

  if (
    event.inputType === "insertCompositionText" ||
    event.inputType === "deleteCompositionText"
  ) {
    return false;
  }

  const commitText = readQuireImeCompositionCommitText(
    event,
    state.compositionBaseInputValue
  );

  if (commitText.length === 0) {
    return false;
  }

  return (
    event.inputType === undefined ||
    event.inputType === null ||
    event.inputType === "" ||
    event.inputType === "insertText" ||
    event.inputType === "insertFromComposition"
  );
}

/**
 * Records a composition commit for subsequent duplicate suppression.
 *
 * @param state - Mutable IME state.
 * @param text - Finalized composition text.
 * @param timestamp - Current timestamp.
 * @returns Nothing.
 */
export function recordQuireImeCompositionCommit(
  state: QuireImeEngineState,
  text: string,
  timestamp: number
): void {
  resetQuireImeCompositionState(state);
  state.lastCompositionEndAt = timestamp;
  state.lastCompositionCommit = {
    text,
    timestamp
  };
}

/**
 * Checks and consumes a browser event that duplicates the recent composition commit.
 *
 * @param state - Mutable IME state.
 * @param event - Browser beforeinput payload.
 * @param now - Current timestamp.
 * @param dedupeWindowMs - Duplicate suppression window.
 * @returns Whether the event duplicated a recent composition commit.
 */
export function consumeDuplicateQuireImeCompositionCommit(
  state: QuireImeEngineState,
  event: QuireImeBeforeInputEvent,
  now: number,
  dedupeWindowMs: number
): boolean {
  if (!state.lastCompositionCommit) {
    return false;
  }

  if (now - state.lastCompositionCommit.timestamp > dedupeWindowMs) {
    state.lastCompositionCommit = null;
    return false;
  }

  const duplicateCompositionCommit =
    event.inputType === "insertFromComposition" &&
    (event.data === null ||
      event.data === undefined ||
      event.data === "" ||
      event.data === state.lastCompositionCommit.text);
  const duplicatePlainCommit =
    event.inputType === "insertText" && event.data === state.lastCompositionCommit.text;

  if (!duplicateCompositionCommit && !duplicatePlainCommit) {
    state.lastCompositionCommit = null;
    return false;
  }

  state.lastCompositionCommit = null;
  return true;
}

/**
 * Checks whether a keydown event likely belongs to a just-finished composition.
 *
 * @param state - Mutable IME state.
 * @param event - Browser keyboard payload.
 * @param now - Current timestamp.
 * @param postCompositionKeyGuardMs - Guard window after composition end.
 * @returns Whether the key should be consumed as IME residue.
 */
export function shouldGuardQuireImePostCompositionKey(
  state: QuireImeEngineState,
  event: QuireImeKeyboardEvent,
  now: number,
  postCompositionKeyGuardMs: number
): boolean {
  const compositionEndAt = state.lastCompositionEndAt;
  // Clear eagerly: at most the first key after a commit can be IME residue, so a
  // later deliberate key must never be affected.
  state.lastCompositionEndAt = null;

  if (compositionEndAt === null || now - compositionEndAt > postCompositionKeyGuardMs) {
    return false;
  }

  // Real composing keys are already consumed by the isComposing/keyCode 229 path,
  // so anything reaching here is unmarked. Only residue dispatched in the *same*
  // millisecond tick as the commit is IME noise; the engine clock is
  // millisecond-granular, so a deliberate key the user presses afterward — e.g.
  // Enter for a new line right after committing CJK text — lands on a later tick
  // and must reach the editor instead of being swallowed.
  return (
    now === compositionEndAt &&
    (event.key === "Enter" || event.key === "Backspace" || event.key === "Delete")
  );
}

/**
 * Reads plain commit text from a composition beforeinput event.
 *
 * @param event - Browser beforeinput payload.
 * @returns Event text committed by the browser.
 */
export function readQuireImeBeforeInputCommitText(
  event: QuireImeBeforeInputEvent
): string {
  return readQuireImeEventText(event);
}

/**
 * Checks whether an empty composition is stale before a plain keyboard event.
 *
 * Empty preedit text alone cannot end a browser composition because deletion
 * may produce an empty intermediate update. A later key explicitly reported as
 * non-composing is the recovery signal for browsers that omit compositionend.
 *
 * @param state - Current IME state.
 * @param event - Keyboard payload reported by the browser.
 * @returns Whether the stale empty session should release keyboard ownership.
 */
export function shouldReleaseQuireImeEmptySessionForKey(
  state: QuireImeEngineState,
  event: QuireImeKeyboardEvent
): boolean {
  return state.composing &&
    state.preeditText.length === 0 &&
    event.isComposing !== true &&
    event.keyCode !== 229;
}
