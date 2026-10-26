import { computed, type Ref } from "vue";
import {
  resolveBuiltinClassicEditorMessage,
  resolveClassicEditorText,
  type BuiltinClassicEditorMessageKey,
  type BuiltinClassicEditorMessageParameters
} from "@classic/localization";
import type {
  ClassicEditorContribution,
  ClassicEditorText
} from "@classic/types";
import { filterVisibleClassicEditorContributions, selectVisibleClassicEditorContributions } from "../../contribution/visibility";
import type { ClassicEditorShellModel } from "../../types";

/**
 * Resolves locale-aware, capability-filtered shell contributions.
 *
 * @param model - Reactive private shell model.
 * @returns Locale, contribution list, selection, and localization helpers.
 */
export function useClassicEditorShellContributions(
  model: Readonly<Ref<ClassicEditorShellModel>>
) {
  const locale = computed(() => model.value.context?.locale ?? model.value.locale);
  const contributions = computed(() => {
    const context = model.value.context;
    return context === undefined
      ? []
      : filterVisibleClassicEditorContributions(
          context.instance.registry.contributions,
          context
        );
  });

  /**
   * Selects one contribution family in registry order.
   *
   * @param kind - Contribution discriminator.
   * @returns Contributions narrowed to the requested family.
   */
  function select<K extends ClassicEditorContribution["kind"]>(
    kind: K
  ): readonly Extract<ClassicEditorContribution, { kind: K }>[] {
    const context = model.value.context;
    return context === undefined ? [] : selectVisibleClassicEditorContributions(
      context.instance.registry.contributions, context, kind
    );
  }

  /**
   * Resolves visible contribution text for the active locale.
   *
   * @param value - Product copy value.
   * @returns Localized visible copy.
   */
  function text(value: ClassicEditorText): string {
    return resolveClassicEditorText(value, locale.value);
  }

  /**
   * Resolves product-owned shell copy from the complete built-in catalog.
   *
   * @param key - Stable built-in message key.
   * @param parameters - Optional named placeholder replacements.
   * @returns Localized product-owned copy.
   */
  function message(
    key: BuiltinClassicEditorMessageKey,
    parameters?: BuiltinClassicEditorMessageParameters
  ): string {
    return resolveBuiltinClassicEditorMessage(locale.value, key, parameters);
  }

  return { contributions, locale, message, select, text } as const;
}
