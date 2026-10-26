import { computed, toValue } from "vue";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionFactory, ClassicEditorToolbarContributionState } from "@classic/types";

/**
 * Selects feature-owned controls without replacing their command or field lifecycle.
 * @param state - Live selection session.
 * @param factory - Existing Ribbon or object control owner.
 * @param values - Feature-local controls admitted to the compact surface.
 * @returns Retained feature with only the requested entries.
 */
export function createClassicCompactToolbar(state: ClassicEditorToolbarContributionState, factory: ClassicEditorToolbarContributionFactory, values: readonly string[]): ClassicEditorToolbarContribution {
  const source = factory(state);
  return { ...source, items: computed(() => toValue(source.items).filter(item => values.includes(item.value))) };
}
