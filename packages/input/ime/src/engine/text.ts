import type {
  QuireImeBeforeInputEvent,
  QuireImeCompositionEvent,
  QuireImeInputEvent
} from "../types";

/**
 * Reads event text while preserving a previous value when the browser sends no text.
 *
 * @param event - Event with browser data and input host value.
 * @param fallback - Fallback text when the event carries no text.
 * @returns Best available event text.
 */
export function readQuireImeEventText(
  event: QuireImeCompositionEvent | QuireImeBeforeInputEvent | QuireImeInputEvent,
  fallback = ""
): string {
  if (event.data !== null && event.data !== undefined && event.data.length > 0) {
    return event.data;
  }

  if (
    event.inputValue !== null &&
    event.inputValue !== undefined &&
    event.inputValue.length > 0
  ) {
    return event.inputValue;
  }

  if (event.data !== null && event.data !== undefined) {
    return event.data;
  }

  return fallback;
}

/**
 * Reads composition text from the input host value relative to its base value.
 *
 * @param event - Event with browser data and input host value.
 * @param baseInputValue - Input host value captured before composition started.
 * @param fallback - Fallback text when neither data nor value diff is available.
 * @returns Current in-progress composition text.
 */
export function readQuireImeCompositionText(
  event: QuireImeCompositionEvent | QuireImeBeforeInputEvent | QuireImeInputEvent,
  baseInputValue: string,
  fallback: string
): string {
  const eventText = readQuireImeEventText(event, fallback);
  const inputDiff = readQuireImeInputValueDiff(event.inputValue, baseInputValue);

  if (inputDiff !== null && (inputDiff.length > 0 || eventText.length === 0)) {
    return inputDiff;
  }

  return eventText;
}

/**
 * Reads finalized composition text from browser data or the input host value.
 *
 * Returns empty when the browser reports no committed data and the input host
 * shows no net added text. That is a cancellation (for example Backspace
 * emptying the preedit, or an iOS-style empty `compositionend`), so the in-flight
 * preedit must not be committed — committing it would leave stray pinyin behind.
 * The last preedit is intentionally not a commit source: it is unreliable (the
 * final syllable can change after the last update), so the textarea diff is
 * preferred.
 *
 * @param event - Browser composition end payload.
 * @param baseInputValue - Input host value captured before composition started.
 * @returns Finalized composition text, or empty when the composition was cancelled.
 */
export function readQuireImeCompositionCommitText(
  event: QuireImeCompositionEvent | QuireImeInputEvent,
  baseInputValue: string
): string {
  if (event.data && event.data.length > 0) {
    return event.data;
  }

  const inputDiff = readQuireImeInputValueDiff(event.inputValue, baseInputValue);

  if (inputDiff !== null && inputDiff.length > 0) {
    return inputDiff;
  }

  return "";
}

/**
 * Diffs the current input host value against the value before composition.
 *
 * @param inputValue - Current textarea/contenteditable value.
 * @param baseInputValue - Value captured before composition started.
 * @returns The suffix added by the browser text service, or null when unavailable.
 */
function readQuireImeInputValueDiff(
  inputValue: string | null | undefined,
  baseInputValue: string
): string | null {
  if (inputValue === null || inputValue === undefined) {
    return null;
  }

  if (baseInputValue.length > 0 && inputValue.startsWith(baseInputValue)) {
    return inputValue.slice(baseInputValue.length);
  }

  if (baseInputValue.length === 0) {
    return inputValue;
  }

  return null;
}
