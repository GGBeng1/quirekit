import { createQuireImeInputEngine } from "@quirekit/ime";

/**
 * Shares QuireKit's IME lifecycle while native contenteditable owns text and undo.
 * @param mount - Instance-local native input boundary.
 * @param changed - Composition availability notification.
 * @returns Keyboard guard, current state and listener disposal.
 */
export function bindMindMapIme(mount: HTMLElement, changed: () => void) {
  const engine = createQuireImeInputEngine();
  let composing = false;
  /** @param next - Engine composition state. */
  function update(next: boolean): void {
    if (composing !== next) { composing = next; changed(); }
  }
  /** @param event - Native input event. @returns Current visible text, if editing. */
  function value(event: Event): string {
    const target = event.target as HTMLElement;
    return target.isContentEditable ? target.innerText : "";
  }
  /** @param event - Native composition start. */
  function start(event: CompositionEvent): void {
    update(engine.handleCompositionStart({ data: event.data, inputValue: value(event) }).isComposing);
    event.stopPropagation();
  }
  /** @param event - Native preedit update. */
  function preedit(event: CompositionEvent): void {
    update(engine.handleCompositionUpdate({ data: event.data, inputValue: value(event) }).isComposing);
    event.stopPropagation();
  }
  /** @param event - Final native composition. */
  function end(event: CompositionEvent): void {
    // The browser already applies text to this visible input. Inserting commitText
    // or clearing it like a hidden input proxy would duplicate or erase content.
    update(engine.handleCompositionEnd({ data: event.data, inputValue: value(event) }).isComposing);
    event.stopPropagation();
  }
  /** @param event - Native mutation intent used only to track IME ownership. */
  function before(event: InputEvent): void {
    update(engine.handleBeforeInput({ inputType: event.inputType, data: event.data,
      isComposing: event.isComposing, inputValue: value(event) }).isComposing);
  }
  /** @param event - Native input; also recovers browsers missing compositionend. */
  function input(event: Event): void {
    const native = event as InputEvent;
    update(engine.handleInput({ inputType: native.inputType, data: native.data,
      isComposing: native.isComposing, inputValue: value(event) }).isComposing);
  }
  /** Resets only transient engine state when the native input loses focus. */
  function blur(): void { update(engine.handleBlur().isComposing); }
  mount.addEventListener("compositionstart", start, true);
  mount.addEventListener("compositionupdate", preedit, true);
  mount.addEventListener("compositionend", end, true);
  mount.addEventListener("beforeinput", before, true);
  mount.addEventListener("input", input, true);
  mount.addEventListener("blur", blur, true);
  return {
    /** @returns Whether native composition currently owns node editing. */
    isComposing: () => composing,
    /** @param event - Key before structural routing. @returns Whether IME owns it. */
    handleKey(event: KeyboardEvent): boolean {
      const result = engine.handleKeyDown(event);
      update(result.isComposing);
      if (result.preventDefault) event.preventDefault();
      return result.handledByIme;
    },
    /** Releases native lifecycle listeners without changing node text. */
    dispose(): void {
      mount.removeEventListener("compositionstart", start, true);
      mount.removeEventListener("compositionupdate", preedit, true);
      mount.removeEventListener("compositionend", end, true);
      mount.removeEventListener("beforeinput", before, true);
      mount.removeEventListener("input", input, true);
      mount.removeEventListener("blur", blur, true);
      engine.handleBlur();
    },
  };
}
