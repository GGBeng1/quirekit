import type { ClassicEditorRenderContext } from "@classic/types";
import {
  executeClassicEditorContributionAction,
  resolveClassicEditorContributionActionState,
  resolveClassicEditorContributionBehavior
} from "../../contribution/utils";
import type { ClassicEditorSelectionPopupActionContribution } from "@classic/types";
import type { ClassicEditorSelectionPopupTrigger } from "@classic/types";

/** Immutable current state of one selection-popup contribution. */
export interface ClassicEditorSelectionPopupActionState {
  /** Whether the contribution is active for the current selection. */
  readonly active: boolean;
  /** Whether the contribution is currently disabled. */
  readonly disabled: boolean;
}

/**
 * Executes one direct or legacy selection action with its normalized trigger.
 *
 * @param item - Selection-popup contribution to execute.
 * @param context - Mounted product render context.
 * @param trigger - Current normalized text-selection trigger.
 * @returns Whether the selected contribution handled the request.
 */
export async function executeClassicEditorSelectionPopupAction(
  item: ClassicEditorSelectionPopupActionContribution,
  context: ClassicEditorRenderContext,
  trigger: ClassicEditorSelectionPopupTrigger
): Promise<boolean> {
  const payload = item.payload?.(trigger, context);
  if ("action" in item) {
    return executeClassicEditorContributionAction(
      item, context, payload, "selection-popup", trigger
    );
  }
  const behavior = resolveClassicEditorContributionBehavior(item);
  if (behavior === undefined) return false;
  return context.instance.executeContribution(
    behavior,
    payload,
    { source: "selection-popup", detail: trigger }
  );
}

/**
 * Projects direct and legacy action state through one selection-popup contract.
 *
 * @param item - Candidate selection-popup contribution.
 * @param context - Mounted product render context.
 * @param trigger - Current normalized text-selection trigger.
 * @returns Current immutable active and disabled values.
 */
export function resolveClassicEditorSelectionPopupActionState(
  item: ClassicEditorSelectionPopupActionContribution,
  context: ClassicEditorRenderContext,
  trigger: ClassicEditorSelectionPopupTrigger
): ClassicEditorSelectionPopupActionState {
  const payload = item.payload?.(trigger, context);
  if ("action" in item) {
    const state = resolveClassicEditorContributionActionState(
      item, context, payload, "selection-popup", trigger
    );
    return Object.freeze({ active: state.active, disabled: !state.canExecute });
  }
  const behavior = resolveClassicEditorContributionBehavior(item);
  return Object.freeze({
    active: behavior?.isActive?.({
      ...context,
      payload,
      trigger: { source: "selection-popup", detail: trigger }
    }) === true,
    disabled: behavior === undefined || !context.instance.canExecuteContribution(
      behavior,
      payload
    )
  });
}
