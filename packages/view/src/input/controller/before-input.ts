import type { QuireBeforeInputEvent, QuireKeyboardInputEvent } from "../types";
import {
  classifyQuireBeforeInputIntent,
  type QuireBeforeInputClipboardIntent,
  type QuireBeforeInputDeleteInputType,
  type QuireBeforeInputKeyboardFallback,
  type QuireBeforeInputTextMutationInputType
} from "./before-input-intent";
import { createSyntheticKeyboardEvent } from "./events/dom";

/** Options used to route a beforeinput editing intent. */
export interface DispatchCanvasBeforeInputIntentOptions {
  /** DOM-light beforeinput event. */
  readonly event: QuireBeforeInputEvent;
  /**
   * Inserts text through the owning input controller.
   *
   * @param text - Text to insert.
   * @returns Whether insertion was handled.
   */
  readonly handleTextInput: (text: string) => boolean;
  /**
   * Handles a beforeinput text mutation before falling back to synthetic keydown routing.
   *
   * @param inputType - beforeinput text mutation inputType token.
   * @returns Whether the mutation intent was handled.
   */
  readonly handleTextMutationInput?: (
    inputType: QuireBeforeInputTextMutationInputType
  ) => boolean;
  /**
   * Handles beforeinput deletion before falling back to synthetic keydown routing.
   *
   * @param inputType - Deletion inputType requested by the beforeinput intent.
   * @returns Whether deletion was handled.
   */
  readonly handleDeleteInput?: (
    inputType: QuireBeforeInputDeleteInputType
  ) => boolean;
  /**
   * Handles clipboard-flavored beforeinput before browser/native fallback.
   *
   * @param intent - Clipboard command represented by beforeinput.
   * @returns Whether the clipboard intent was handled.
   */
  readonly handleClipboardInput?: (
    intent: QuireBeforeInputClipboardIntent
  ) => boolean;
  /**
   * Dispatches a keyboard fallback event through the owning input controller.
   *
   * @param event - Synthetic keyboard event.
   * @returns Whether the key was handled.
   */
  readonly dispatchKeyDown: (event: QuireKeyboardInputEvent) => boolean;
}

/**
 * Routes a beforeinput intent to canvas-owned mutation fallbacks.
 *
 * @param options - Event and controller callbacks.
 * @returns Whether the beforeinput intent was handled.
 */
export function dispatchQuireBeforeInputIntent(
  options: DispatchCanvasBeforeInputIntentOptions
): boolean {
  const intent = classifyQuireBeforeInputIntent(options.event);

  switch (intent?.kind) {
    case "text-input":
      return options.handleTextInput(intent.text);
    case "text-mutation":
      return dispatchQuireBeforeInputTextMutationIntent(
        options,
        intent.inputType,
        intent.fallbackKey
      );
    case "delete":
      return dispatchQuireBeforeInputDeleteIntent(
        options,
        intent.inputType,
        intent.fallbackKey
      );
    case "clipboard":
      return options.handleClipboardInput?.(intent) ?? false;
    case undefined:
      return false;
  }
}

/**
 * Routes a beforeinput text-mutation intent before using the keyboard fallback path.
 *
 * @param options - Event and controller callbacks.
 * @param inputType - beforeinput text mutation inputType token.
 * @param fallbackKey - Keyboard fallback used by the legacy fallback path.
 * @returns Whether the mutation was handled.
 */
function dispatchQuireBeforeInputTextMutationIntent(
  options: DispatchCanvasBeforeInputIntentOptions,
  inputType: QuireBeforeInputTextMutationInputType,
  fallbackKey: QuireBeforeInputKeyboardFallback
): boolean {
  if (options.handleTextMutationInput?.(inputType)) {
    return true;
  }

  return dispatchQuireBeforeInputKeyboardFallback(options, fallbackKey);
}

/**
 * Routes a beforeinput delete intent before using the keyboard fallback path.
 *
 * @param options - Event and controller callbacks.
 * @param inputType - Deletion inputType requested by beforeinput.
 * @param fallbackKey - Optional keyboard fallback used by the legacy path.
 * @returns Whether deletion was handled.
 */
function dispatchQuireBeforeInputDeleteIntent(
  options: DispatchCanvasBeforeInputIntentOptions,
  inputType: QuireBeforeInputDeleteInputType,
  fallbackKey: QuireBeforeInputKeyboardFallback | undefined
): boolean {
  if (options.handleDeleteInput?.(inputType)) {
    return true;
  }

  return fallbackKey
    ? dispatchQuireBeforeInputKeyboardFallback(options, fallbackKey)
    : false;
}

/**
 * Dispatches a synthetic keyboard fallback for an editable-text beforeinput intent.
 *
 * @param options - Event and controller callbacks.
 * @param fallbackKey - Keyboard fallback facts.
 * @returns Whether the fallback key was handled.
 */
function dispatchQuireBeforeInputKeyboardFallback(
  options: DispatchCanvasBeforeInputIntentOptions,
  fallbackKey: QuireBeforeInputKeyboardFallback
): boolean {
  return options.dispatchKeyDown(
    createSyntheticKeyboardEvent(fallbackKey.key, {
      shiftKey: fallbackKey.shiftKey
    })
  );
}

/**
 * Checks whether a beforeinput event belongs to browser-owned composition.
 *
 * @param event - beforeinput event to inspect.
 * @param composing - Whether the controller is currently composing.
 * @returns Whether the event should bypass QuireKit mutation handling.
 */
export function shouldIgnoreQuireBeforeInputDuringComposition(
  event: QuireBeforeInputEvent,
  composing: boolean
): boolean {
  return (
    composing ||
    event.isComposing === true ||
    event.inputType === "insertCompositionText" ||
    event.inputType === "deleteCompositionText"
  );
}
