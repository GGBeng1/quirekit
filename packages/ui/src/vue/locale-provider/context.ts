import { computed, inject, type ComputedRef, type InjectionKey } from "vue";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { QuireKitLocale, QuireKitMessages, QuireKitMessageScope } from "../../locale/types";

/** Active language supplied by the nearest QuireLocaleProvider. */
export const quireKitLocaleKey: InjectionKey<ComputedRef<QuireKitLocale>> = Symbol("QuireKitLocale");

/** @returns The active language; Chinese when no provider is mounted. */
function activeLocale(): ComputedRef<QuireKitLocale> {
  return inject(quireKitLocaleKey, computed(() => quireKitDefaultLocale));
}

/**
 * Reads one component's interface text from the active language.
 * @param scope - Component whose messages are needed.
 * @returns Reactive messages that follow language changes.
 */
export function useQuireKitMessages<Scope extends QuireKitMessageScope>(scope: Scope): ComputedRef<QuireKitMessages[Scope]> {
  const locale = activeLocale();
  return computed(() => locale.value.messages[scope]);
}

/** @returns Reactive BCP 47 tag of the active language, for date, number and size formatting. */
export function useQuireKitLocale(): ComputedRef<string> {
  const locale = activeLocale();
  return computed(() => locale.value.code);
}
