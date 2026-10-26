import type {
  QuireEditorInputBindingOptions,
  QuireEditorInputBindingSource,
  QuireEditorInputResult
} from "../types";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireImeEventResult } from "@quirekit/ime";
import { createQuireImePreedit } from "./ime-preedit";
import { QuirePendingInputEchoTracker } from "./input-echo";
import {
  clearQuireInputProxyValue,
  restartQuireNativeInputSession
} from "./input-proxy-state";
import { createInputBindingUpdate } from "./update";

/** Options used by a mounted input result applier. */
export interface QuireMountedInputResultApplierOptions {
  /** Editor, input proxy, and render callbacks for the mounted view. */
  readonly binding: QuireEditorInputBindingOptions;
  /** Restores native context when a mounted policy owns proxy clearing. */
  readonly restoreInputProxy?: (() => boolean) | undefined;
  /**
   * Commits finalized IME text through the mounted controller.
   *
   * @param text - Text committed by the reusable IME engine.
   * @returns Input result for the committed text.
   */
  readonly commitCompositionText: (text: string) => QuireEditorInputResult;
}

/** Applies controller and IME side effects to a mounted input binding. */
export class QuireMountedInputResultApplier {
  private readonly options: QuireMountedInputResultApplierOptions;
  private readonly pendingInputEcho = new QuirePendingInputEchoTracker();
  private currentImePreedit: QuireImePreedit | undefined;

  /**
   * Creates a mounted input result applier.
   *
   * @param options - Binding callbacks and commit function.
   */
  constructor(options: QuireMountedInputResultApplierOptions) {
    this.options = options;
  }

  /**
   * Remembers text that may echo through a later native input event.
   *
   * @param text - Text already applied to the editor.
   */
  rememberInputEcho(text: string | null | undefined): void {
    this.pendingInputEcho.remember(text);
  }

  /**
   * Consumes and clears a duplicate native input echo when present.
   *
   * @param text - Current native input proxy value.
   * @returns Whether the input value was a duplicate echo.
   */
  consumeInputEcho(text: string): boolean {
    if (!this.pendingInputEcho.consume(text)) {
      return false;
    }

    this.clearInputProxyValue();
    return true;
  }

  /** Clears pending echo, input proxy value, and IME preedit state. */
  clearTransientState(): void {
    this.pendingInputEcho.clear();
    this.clearInputProxyValue();
    this.clearImePreedit();
  }

  /**
   * Restarts the browser-owned input session when JS state reset is not enough.
   */
  restartNativeInputSession(): void {
    restartQuireNativeInputSession(this.options.binding.inputProxy);
  }

  /**
   * Clears the textarea value and collapses its native selection to a stable origin.
   */
  clearInputProxyValue(): void {
    if (this.options.restoreInputProxy?.()) return;
    clearQuireInputProxyValue(this.options.binding.inputProxy);
  }

  /**
   * Applies a reusable IME engine result to editor input and preedit rendering.
   *
   * @param result - IME result returned by the reusable engine.
   * @param event - Browser event that may need default prevention.
   * @returns Whether the event was consumed by IME handling.
   */
  applyImeResult(result: QuireImeEventResult, event?: Event): boolean {
    if (!result.handledByIme) {
      return false;
    }

    if (result.preventDefault) {
      event?.preventDefault();
    }

    if (result.commitText !== undefined) {
      const applied = this.applyInputResult(
        "compositionend",
        this.options.commitCompositionText(result.commitText)
      );

      if (applied) {
        this.rememberInputEcho(result.commitText);
      }
    } else if (result.isComposing) {
      this.renderImePreedit(result.preeditText);
    } else {
      this.clearImePreedit();
    }

    if (result.clearInput) {
      this.clearInputProxyValue();
    }

    return true;
  }

  /**
   * Applies an input controller result to the mounted view callbacks.
   *
   * @param source - Browser input source that produced the result.
   * @param result - Result returned by the input controller.
   * @returns Whether the input result was handled.
   */
  applyInputResult(
    source: QuireEditorInputBindingSource,
    result: QuireEditorInputResult
  ): boolean {
    if (!result.handled) {
      return false;
    }

    this.clearInputProxyValue();
    this.clearImePreedit();
    this.options.binding.onUpdate?.(createInputBindingUpdate(source, result));
    return true;
  }

  /**
   * Applies a clipboard controller result to mounted view callbacks.
   *
   * @param source - Clipboard source that produced the result.
   * @param result - Result returned by the input controller.
   * @param clearInput - Whether the input proxy should be cleared.
   */
  applyClipboardResult(
    source: "cut" | "paste",
    result: QuireEditorInputResult,
    clearInput: boolean
  ): void {
    if (!result.handled) {
      return;
    }

    if (clearInput) {
      this.clearInputProxyValue();
      this.clearImePreedit();
    }

    if (result.docChanged) {
      this.options.binding.onUpdate?.(createInputBindingUpdate(source, result));
    }
  }

  /**
   * Renders or clears transient IME preedit text.
   *
   * @param preeditText - Current preedit text.
   */
  private renderImePreedit(preeditText: string): void {
    const preedit = createQuireImePreedit(this.options.binding, preeditText);

    if (isSameQuireImePreedit(preedit, this.currentImePreedit)) {
      return;
    }

    this.currentImePreedit = preedit;
    this.options.binding.onImePreedit?.(preedit);
  }

  /** Clears active IME preedit rendering if needed. */
  private clearImePreedit(): void {
    if (this.currentImePreedit === undefined) {
      return;
    }

    this.currentImePreedit = undefined;
    this.options.binding.onImePreedit?.(undefined);
  }
}

/**
 * Compares two transient IME preedits for mounted-view render reuse.
 *
 * Browsers can report the same preedit text through `compositionupdate`,
 * `beforeinput`, and `input` in quick succession. Rendering each duplicate would
 * trigger repeated full IME preedit paints, so equality covers the visible text
 * and the document range it occupies.
 *
 * @param left - First preedit descriptor to compare.
 * @param right - Second preedit descriptor to compare.
 * @returns Whether both preedit descriptors describe the same visible preedit.
 */
function isSameQuireImePreedit(
  left: QuireImePreedit | undefined,
  right: QuireImePreedit | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return (
    left.text === right.text &&
    left.range.from === right.range.from &&
    left.range.to === right.range.to
  );
}
