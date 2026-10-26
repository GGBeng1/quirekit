import type {
  QuireBeforeInputEvent,
  QuireClipboardEvent,
  QuireCompositionInputEvent,
  QuireEditorInputControllerOptions,
  QuireEditorInputResult,
  QuireKeyboardInputEvent
} from "./types";
import {
  createQuireEditorInputControllerRuntime,
  type QuireEditorInputControllerRuntime
} from "./controller/runtime";
import {
  handleQuireControllerBeforeInput
} from "./controller/handlers/before-input";
import {
  handleQuireControllerCopyInput,
  handleQuireControllerCutInput,
  handleQuireControllerPasteInput
} from "./controller/handlers/clipboard";
import {
  handleQuireControllerCompositionEnd,
  handleQuireControllerCompositionStart,
  handleQuireControllerCompositionUpdate
} from "./controller/handlers/composition";
import { handleQuireControllerTextInput } from "./controller/handlers/text";
import { shouldIgnoreQuireKeyDownDuringComposition } from "./controller/dispatch/keyboard";

/** Routes browser input events into QuireKit editor transactions. */
export class QuireEditorInputController {
  private readonly runtime: QuireEditorInputControllerRuntime;

  /**
   * Creates an input controller for a canvas editor.
   *
   * @param options - Editor and composition state.
   */
  constructor(options: QuireEditorInputControllerOptions) {
    this.runtime = createQuireEditorInputControllerRuntime(options);
  }

  /**
   * Handles plain text input.
   *
   * @param text - Text to insert at the current selection.
   * @param compositionId - Optional PM composition id for history grouping.
   * @returns Whether the text was handled and whether the document changed.
   */
  handleTextInput(text: string, compositionId?: number): QuireEditorInputResult {
    return handleQuireControllerTextInput(this.runtime, text, compositionId);
  }

  /**
   * Handles a beforeinput-style editing intent.
   *
   * @param event - DOM-light beforeinput event.
   * @returns Whether the intent was handled and whether the document changed.
   */
  handleBeforeInput(event: QuireBeforeInputEvent): QuireEditorInputResult {
    return handleQuireControllerBeforeInput(this.runtime, event);
  }

  /**
   * Handles a keyboard editing event.
   *
   * @param event - DOM-light keyboard event.
   * @returns Whether the key was handled and whether the document changed.
   */
  handleKeyDown(event: QuireKeyboardInputEvent): QuireEditorInputResult {
    if (shouldIgnoreQuireKeyDownDuringComposition(this.runtime, event)) {
      return { handled: false, docChanged: false };
    }

    const result = this.runtime.captureInputResult(() =>
      this.runtime.dispatchKeyDown(event)
    );

    if (result.handled) {
      event.preventDefault?.();
    }

    return result;
  }

  /**
   * Handles copying the current editor selection as rich clipboard data.
   *
   * @param event - Clipboard event carrying a writable data adapter.
   * @returns Whether copy data was written.
   */
  handleCopy(event: QuireClipboardEvent): QuireEditorInputResult {
    return handleQuireControllerCopyInput(this.runtime, event);
  }

  /**
   * Handles cutting the current editor selection as rich clipboard data.
   *
   * @param event - Clipboard event carrying a writable data adapter.
   * @returns Whether cut data was written and the selection deleted.
   */
  handleCut(event: QuireClipboardEvent): QuireEditorInputResult {
    return handleQuireControllerCutInput(this.runtime, event);
  }

  /**
   * Handles pasting rich clipboard data into the current editor selection.
   *
   * @param event - Clipboard event carrying readable plain text.
   * @returns Whether paste text was inserted.
   */
  handlePaste(event: QuireClipboardEvent): QuireEditorInputResult {
    return handleQuireControllerPasteInput(this.runtime, event);
  }

  /**
   * Starts a browser IME composition session.
   *
   * @param event - Optional composition event carrying initial text.
   * @returns Composition state update result.
   */
  handleCompositionStart(event?: QuireCompositionInputEvent): QuireEditorInputResult {
    return handleQuireControllerCompositionStart(this.runtime, event);
  }

  /**
   * Updates in-progress IME composition text without mutating the document.
   *
   * @param event - Composition update event.
   * @returns Composition state update result.
   */
  handleCompositionUpdate(event: QuireCompositionInputEvent): QuireEditorInputResult {
    return handleQuireControllerCompositionUpdate(this.runtime, event);
  }

  /**
   * Commits finalized IME composition text once the browser session ends.
   *
   * @param event - Composition end event.
   * @returns Input result for the finalized text commit.
   */
  handleCompositionEnd(event: QuireCompositionInputEvent): QuireEditorInputResult {
    return handleQuireControllerCompositionEnd(this.runtime, event);
  }

  /** Cancels an in-progress IME session without committing preedit text. */
  cancelComposition(): void {
    this.runtime.composition.cancel();
  }
}

/**
 * Creates a canvas editor input controller.
 *
 * @param options - Editor and composition state.
 * @returns Canvas editor input controller.
 */
export function createQuireEditorInputController(
  options: QuireEditorInputControllerOptions
): QuireEditorInputController {
  return new QuireEditorInputController(options);
}
