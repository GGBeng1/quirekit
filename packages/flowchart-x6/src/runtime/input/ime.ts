import { createQuireImeInputEngine } from "@quirekit/ime";

/** @param input - Native textarea which owns its text and undo. @param changed - Small UI invalidation. @returns IME guard and cleanup. */
export function bindFlowIme(input: HTMLTextAreaElement, changed: () => void) {
  const engine = createQuireImeInputEngine();
  let composing = false;
  /** @param state - Updated composition ownership. */
  function update(state: boolean): void { if (state !== composing) { composing = state; changed(); } }
  /** @param e - Native composition start. */
  function start(e: CompositionEvent): void { update(engine.handleCompositionStart({ data: e.data, inputValue: input.value }).isComposing); }
  /** @param e - Native composition update. */
  function preedit(e: CompositionEvent): void { update(engine.handleCompositionUpdate({ data: e.data, inputValue: input.value }).isComposing); }
  /** @param e - Native composition end. */
  function end(e: CompositionEvent): void { update(engine.handleCompositionEnd({ data: e.data, inputValue: input.value }).isComposing); }
  /** @param event - Native mutation; the textarea has already received the text. */
  function inputEvent(event: Event): void {
    const e = event as InputEvent;
    update(engine.handleInput({ inputType: e.inputType, data: e.data, isComposing: e.isComposing, inputValue: input.value }).isComposing);
  }
  /** @param event - Native input intent. */
  function before(event: Event): void {
    const e = event as InputEvent;
    update(engine.handleBeforeInput({ inputType: e.inputType, data: e.data, isComposing: e.isComposing, inputValue: input.value }).isComposing);
  }
  input.addEventListener("compositionstart", start); input.addEventListener("compositionupdate", preedit);
  input.addEventListener("compositionend", end); input.addEventListener("beforeinput", before); input.addEventListener("input", inputEvent);
  return {
    /** @returns Whether IME currently owns the native textarea. */ isComposing: () => composing,
    /** @param event - Native key. @returns Whether the key belongs to IME. */
    guard(event: KeyboardEvent): boolean {
      const result = engine.handleKeyDown(event); update(result.isComposing);
      if (result.preventDefault) event.preventDefault();
      return result.handledByIme;
    },
    /** Releases transient IME ownership and listeners. */
    destroy(): void {
      input.removeEventListener("compositionstart", start); input.removeEventListener("compositionupdate", preedit);
      input.removeEventListener("compositionend", end); input.removeEventListener("beforeinput", before); input.removeEventListener("input", inputEvent);
      engine.handleBlur();
    },
  };
}
