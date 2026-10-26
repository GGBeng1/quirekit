import { computed, toValue } from "vue";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { projectClassicToolbarFeature } from "@classic/shell/contribution/toolbar/features";
import { classicToolbarRenderers } from "@classic/shell/contribution/toolbar/renderers";
import { changeClassicToolbarPopup, executeClassicToolbar } from "@classic/shell/contribution/toolbar/execution";
import type { ClassicToolbarContext } from "@classic/shell/contribution/toolbar/types";

/**
 * Composes retained native-control configurations without nesting Toolbar roots.
 * Standalone dialogs remain the caller's responsibility; this composes controls only.
 * @param state - Live mounted context shared by all feature controllers.
 * @param sources - Named, already-created feature configurations.
 * @returns Namespaced public entries with their original renderer and event scopes.
 */
export function composeClassicEditorToolbar(state: ClassicEditorToolbarContributionState, sources: Readonly<Record<string, ClassicEditorToolbarContribution>>): ClassicEditorToolbarContribution {
  const features = computed(() => new Map(Object.entries(sources).map(([key, configuration]) => [key,
    { key, configuration, items: toValue(configuration.items) }
  ])));
  const adapter: ClassicToolbarContext = {
    model: { get context() { return state.context; }, get locale() { return state.context.locale; } },
    get features() { return features.value; }, menus: new Map()
  };
  return {
    items: computed(() => [...features.value.values()].flatMap(feature => projectClassicToolbarFeature(feature.key, feature.items))),
    context: adapter,
    renderers: classicToolbarRenderers,
    /** @param event - Original intent, routed to the retained feature object. @returns Feature completion. */
    execute: event => executeClassicToolbar(event, adapter),
    /** @param event - Admitted popup state, returned to its business owner. */
    openChange: event => changeClassicToolbarPopup(event, adapter)
  };
}
