import type {
  ClassicEditorActionRibbonControlContribution,
  ClassicEditorCommandBarOptions,
  ClassicEditorRibbonGroupContribution
} from "../../../types";
import type { ResolvedClassicEditorCommandStripGroup } from "./types";

/**
 * Resolves direct-action-only groups for the rebuilt Command Strip.
 *
 * Legacy ribbon controls and feature-owned widgets are intentionally excluded;
 * producer migration must supply `ClassicEditorActionDefinition` projections.
 *
 * @param groups - Capability-filtered group declarations.
 * @param actions - Capability-filtered direct action controls.
 * @param options - Optional consumer composition.
 * @returns Immutable groups containing direct typed actions only.
 */
export function resolveClassicEditorCommandStripGroups(
  groups: readonly ClassicEditorRibbonGroupContribution[],
  actions: readonly ClassicEditorActionRibbonControlContribution[],
  options: ClassicEditorCommandBarOptions | undefined
): readonly ResolvedClassicEditorCommandStripGroup[] {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  if (options?.groups === undefined) {
    return groups.flatMap((group) => {
      const items = actions.filter((action) => action.groupId === group.id);
      return items.length === 0 ? [] : [Object.freeze({
        id: group.id,
        tabId: group.tabId,
        label: group.label,
        priority: group.priority ?? "primary",
        items: Object.freeze(items)
      })];
    });
  }
  return options.groups.flatMap((configured) => {
    const declaration = groups.find((group) => group.id === configured.id);
    const items = configured.controls.flatMap((id) => {
      const action = actionById.get(id);
      return action === undefined ? [] : [action];
    });
    return items.length === 0 ? [] : [Object.freeze({
      id: configured.id,
      tabId: configured.tabId ?? declaration?.tabId ?? "home",
      label: configured.label ?? declaration?.label ?? configured.id,
      priority: declaration?.priority ?? "primary",
      items: Object.freeze(items)
    })];
  });
}
