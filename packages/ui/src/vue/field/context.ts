import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue";

const fieldLabelKey: InjectionKey<ComputedRef<string | undefined>> = Symbol("QuireFieldLabel");

/**
 * Supplies the nearest visible field label without coupling inputs to DOM structure.
 * @param label - Reactive label owned by this field.
 */
export function provideFieldLabel(label: () => string): void {
  provide(fieldLabelKey, computed(label));
}

/** @returns Nearest field label, including through a provider-preserving Teleport. */
export function useFieldLabel(): ComputedRef<string | undefined> {
  return inject(fieldLabelKey, computed(() => undefined));
}
