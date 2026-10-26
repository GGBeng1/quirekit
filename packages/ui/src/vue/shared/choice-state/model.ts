import { computed, ref, watchEffect } from "vue";
import type { Ref } from "vue";
import type { ChoiceStateProps } from "./types";

/**
 * Keeps controlled values, local defaults and native reset under distinct owners.
 * @param props - Reactive public model and interaction flags.
 * @param emit - Host update notification.
 * @param root - Compound control root used to locate its native form.
 * @returns Current values and guarded interaction updates.
 */
export function useChoiceState(props: ChoiceStateProps, emit: (value: string[]) => void, root: Ref<HTMLElement | null>) {
  const initial = [...new Set(props.defaultValue ?? [])];
  const local = ref(initial);
  const values = computed<readonly string[]>(() => props.modelValue ?? local.value);

  /**
   * Applies a user interaction without mutating a controlled prop.
   * @param next - Requested next selection.
   */
  function update(next: readonly string[]): void {
    if (props.disabled || props.readOnly) return;
    const unique = [...new Set(next)];
    if (unique.length === values.value.length && unique.every((value, index) => values.value[index] === value)) return;
    if (props.modelValue === undefined) local.value = unique;
    emit(unique);
  }

  watchEffect(onCleanup => {
    const element = root.value;
    if (!element) return;
    const candidate = props.form ? element.ownerDocument.getElementById(props.form) : element.closest("form");
    if (!(candidate instanceof HTMLFormElement)) return;
    /**
     * Waits for cancellation and lets controlled Form owners restore their own defaults.
     * @param event - Native reset, which may be prevented by QuireForm.
     */
    function reset(event: Event): void {
      queueMicrotask(() => {
        if (!event.defaultPrevented && props.modelValue === undefined) {
          local.value = [...initial];
          emit([...initial]);
        }
      });
    }
    candidate.addEventListener("reset", reset);
    onCleanup(() => candidate.removeEventListener("reset", reset));
  }, { flush: "post" });
  return { values, update };
}

/**
 * Rejects ambiguous option identities before rendering interactive controls.
 * @param items - Ordered options shared by the host and rendered controls.
 */
export function assertChoiceValues(items: readonly { readonly value: string }[]): void {
  const values = new Set<string>();
  for (const item of items) {
    if (typeof item.value !== "string" || !item.value || values.has(item.value)) throw new Error(`Choice values must be non-empty and unique: ${item.value}`);
    values.add(item.value);
  }
}
