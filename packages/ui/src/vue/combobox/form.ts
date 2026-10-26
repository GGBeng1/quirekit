import { nextTick, watchEffect, watchPostEffect, type Ref } from "vue";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { ComboboxFormProps } from "./types";

/**
 * Coordinates native submission/validation with the selected value and search draft.
 * Ark's Combobox supplies the editable input but has no separate semantic field or reset lifecycle.
 * @param props - Public form and interaction properties.
 * @param field - Hidden native field that owns semantic submission and form association.
 * @param selectedValue - Current committed scalar value.
 * @param inputValue - Current display text, including caller-controlled drafts.
 * @param resetModel - Restores only locally owned initial state.
 * @param requiredMessage - Native validation text for a missing required value, in the active language.
 */
export function useComboboxForm(
  props: Readonly<ComboboxFormProps>,
  field: Ref<HTMLInputElement | null>,
  selectedValue: () => string | undefined,
  inputValue: () => string,
  resetModel: () => void,
  requiredMessage: () => string = () => quireKitDefaultLocale.messages.combobox.required
): void {
  /**
   * Resolves the focusable validation target within this compound control.
   * @returns The search input when the component is mounted.
   */
  function input(): HTMLInputElement | null {
    return field.value?.parentElement?.querySelector<HTMLInputElement>('input[role="combobox"]') ?? null;
  }

  watchPostEffect(() => {
    const missing = props.required && !props.disabled && !props.readOnly && !selectedValue();
    // A nonempty search draft is not a submitted selection. Keep native validation
    // on the visible input so the browser can focus the correct control.
    input()?.setCustomValidity(missing ? requiredMessage() : "");
  });

  watchEffect(onCleanup => {
    const element = field.value;
    if (!element) return;
    const root = element.getRootNode();
    const events = root.nodeType === 11 && "host" in root ? root : element.ownerDocument;
    let active = true;
    /**
     * Applies an uncancelled reset after all host listeners have run.
     * @param event - Native reset that a Form owner may cancel.
     */
    function reset(event: Event): void {
      if (event.target !== field.value?.form) return;
      queueMicrotask(() => {
        if (!active || event.defaultPrevented || event.target !== field.value?.form) return;
        resetModel();
        void nextTick(() => {
          const control = input();
          // Native reset also changes an input's DOM value. Reconcile even when
          // controlled props did not change, without manufacturing an input event.
          if (active && control) control.value = inputValue();
        });
      });
    }
    // Resolve native form ownership at event time. A referenced form may be
    // mounted later or replaced with the same id without changing component props.
    events.addEventListener("reset", reset, true);
    onCleanup(() => {
      active = false;
      events.removeEventListener("reset", reset, true);
    });
  }, { flush: "post" });
}
