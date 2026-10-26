import type { MathInputBuffer } from './types';

/**
 * Adapts a consumer-owned native buffer without changing the shared IME protocol.
 * @param input - Form control or explicitly declared editable capture element.
 * @returns Buffer access and restoration of the consumer's original state.
 */
export function createMathInputBuffer(input: HTMLElement): MathInputBuffer {
  if (input.localName === 'textarea' || input.localName === 'input') {
    const control = input as HTMLTextAreaElement | HTMLInputElement;
    const original = { value: control.value, disabled: control.disabled };
    return {
      /** @returns Current native text, including any pending composition. */
      read: () => control.value,
      /** Releases only the consumed native text. */
      clear() { if (control.value) control.value = ''; },
      /** @param disabled - Whether the core currently rejects editing. */
      setDisabled(disabled) { if (control.disabled !== disabled) control.disabled = disabled; },
      /** Restores the consumer's form state after native listeners have been removed. */
      restore() { control.disabled = original.disabled; control.value = original.value; },
    };
  }
  const editable = input.getAttribute('contenteditable');
  if (editable === null || !['', 'true', 'false', 'plaintext-only'].includes(editable.toLowerCase())) {
    throw new TypeError('Formula input must be an input, textarea or explicit contenteditable capture');
  }
  const original = { editable, disabled: input.getAttribute('aria-disabled'), children: [...input.childNodes] };
  return {
    /** @returns Pending native text without layout or rich-text interpretation. */
    read: () => input.textContent ?? '',
    /** Clears only after the IME permits it; composition keeps its native text node. */
    clear() { if (input.firstChild) input.replaceChildren(); },
    /** @param disabled - Whether the core currently rejects editing. */
    setDisabled(disabled) {
      // Selection and preedit also publish snapshots. Attribute writes belong only
      // to availability transitions so they cannot restart native composition.
      const mode = disabled ? 'false' : 'plaintext-only';
      if (input.contentEditable !== mode) input.contentEditable = mode;
      const aria = String(disabled);
      if (input.getAttribute('aria-disabled') !== aria) input.setAttribute('aria-disabled', aria);
    },
    /** Returns the original nodes, preserving consumer identity and listeners. */
    restore() {
      input.setAttribute('contenteditable', original.editable);
      if (original.disabled === null) input.removeAttribute('aria-disabled');
      else input.setAttribute('aria-disabled', original.disabled);
      input.replaceChildren(...original.children);
    },
  };
}
