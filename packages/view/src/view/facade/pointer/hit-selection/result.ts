import type { Selection } from "@quirekit/pm";
import { resolveQuireHitTestSelectionTarget } from "@quirekit/view-engine";
import type { QuireSelectionDomain } from "@quirekit/view-engine";
import type { QuireViewPointerSelectionResult } from "../../../types";
import type {
  SelectQuireViewPointerHitBaseOptions,
  SelectQuireViewPointerHitOptions
} from "./types";

/**
 * Creates the pointer-selection result for one resolved hit.
 *
 * @param options - Geometry snapshot and hit-test result.
 * @param updated - Whether selection semantics produced a transaction.
 * @param selectionDomain - Selection domain that interpreted the hit, when known.
 * @returns Pointer selection result matching the view facade contract.
 */
export function createQuireViewPointerHitSelectionResult(
  options: SelectQuireViewPointerHitOptions,
  updated: boolean,
  selectionDomain?: QuireSelectionDomain
): QuireViewPointerSelectionResult {
  return {
    geometrySnapshot: options.geometrySnapshot,
    hitTestResult: options.hitTestResult,
    interactionTarget: resolveQuireHitTestSelectionTarget({
      hitTestResult: options.hitTestResult
    }),
    updated,
    ...(selectionDomain === undefined ? {} : { selectionDomain })
  };
}

/**
 * Dispatches a selection transaction using the state that produced it.
 *
 * @param options - PM state and dispatch hook.
 * @param selection - Selection produced by shared selection semantics.
 * @returns Whether the selection differed and a transaction was dispatched.
 */
export function dispatchQuireViewPointerSelection(
  options: SelectQuireViewPointerHitBaseOptions,
  selection: Selection
): boolean {
  if (options.state.selection.eq(selection)) {
    return false;
  }

  options.dispatchTransaction(options.state.tr.setSelection(selection));
  return true;
}
