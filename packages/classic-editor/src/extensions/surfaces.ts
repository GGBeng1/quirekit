import type {
  ClassicEditorActionDefinition,
  ClassicEditorActionRibbonControlContribution,
  ClassicEditorActionSelectionPopupItemContribution,
  ClassicEditorActionToolbarControlContribution
} from "../types";

/**
 * Projects one direct action onto Ribbon chrome without accepting a behavior.
 *
 * @param id - Stable contribution id.
 * @param groupId - Parent ribbon group id.
 * @param action - Shared direct typed action definition.
 * @returns Ribbon action contribution.
 */
export function createClassicEditorRibbonAction(
  id: string,
  groupId: string,
  action: ClassicEditorActionDefinition
): ClassicEditorActionRibbonControlContribution {
  return {
    kind: "ribbon-action-control",
    id,
    groupId,
    label: action.label,
    action,
    icon: action.icon,
    order: action.order
  };
}

/**
 * Projects one direct action onto compact toolbar chrome without accepting a behavior.
 *
 * @param id - Stable contribution id.
 * @param action - Shared direct typed action definition.
 * @returns Compact-toolbar action contribution.
 */
export function createClassicEditorToolbarAction(
  id: string,
  action: ClassicEditorActionDefinition
): ClassicEditorActionToolbarControlContribution {
  return {
    kind: "toolbar-action-control",
    id,
    label: action.label,
    action,
    icon: action.icon,
    order: action.order
  };
}

/**
 * Projects one direct action onto the text-selection popup without a behavior.
 *
 * @param id - Stable contribution id.
 * @param action - Shared direct typed action definition.
 * @returns Selection popup action contribution.
 */
export function createClassicEditorSelectionPopupAction(
  id: string,
  action: ClassicEditorActionDefinition
): ClassicEditorActionSelectionPopupItemContribution {
  return {
    kind: "selection-popup-item",
    id,
    label: action.label,
    action,
    icon: action.icon,
    order: action.order
  };
}
