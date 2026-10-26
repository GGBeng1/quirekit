import {
  resolveQuireHitTestSelectionTarget,
  resolveQuirePointerHitSelectionSemantics,
  resolveQuireTextAnchorSelectionSemantics
} from "@quirekit/view-engine";
import type { QuireViewPointerSelectionResult } from "../../../types";
import {
  createQuireViewPointerHitSelectionResult,
  dispatchQuireViewPointerSelection
} from "./result";
import type {
  SelectQuireViewPointerAnchorHitOptions,
  SelectQuireViewPointerHitOptions
} from "./types";

/**
 * Applies an already-resolved pointer hit to the editor selection.
 *
 * @param options - PM state, dispatch hook, geometry snapshot, and pointer hit.
 * @returns Pointer hit selection result matching the view facade contract.
 */
export function selectQuireViewPointerHit(
  options: SelectQuireViewPointerHitOptions
): QuireViewPointerSelectionResult {
  const selectionSemantics = resolveQuirePointerHitSelectionSemantics({
    doc: options.state.doc,
    hitTestResult: options.hitTestResult,
    interactionTarget: resolveQuireHitTestSelectionTarget({
      hitTestResult: options.hitTestResult
    })
  });

  if (selectionSemantics === null) {
    return createQuireViewPointerHitSelectionResult(options, false);
  }

  const updated = dispatchQuireViewPointerSelection(
    options,
    selectionSemantics.selection
  );

  return createQuireViewPointerHitSelectionResult(
    options,
    updated,
    selectionSemantics.domain
  );
}

/**
 * Extends selection from the current PM anchor to an already-resolved pointer hit.
 *
 * @param options - PM state, dispatch hook, geometry snapshot, pointer hit, and hook policy.
 * @returns Pointer hit selection result matching the view facade contract.
 */
export function selectQuireViewPointerHitFromSelectionAnchor(
  options: SelectQuireViewPointerAnchorHitOptions
): QuireViewPointerSelectionResult {
  const selectionSemantics = resolveQuireTextAnchorSelectionSemantics({
    doc: options.state.doc,
    anchor: options.state.selection.anchor,
    hitTestResult: options.hitTestResult,
    ...(options.createSelectionBetween === undefined
      ? {}
      : { createSelectionBetween: options.createSelectionBetween })
  });

  if (selectionSemantics === null) {
    return createQuireViewPointerHitSelectionResult(options, false);
  }

  const updated = dispatchQuireViewPointerSelection(
    options,
    selectionSemantics.selection
  );

  return createQuireViewPointerHitSelectionResult(
    options,
    updated,
    selectionSemantics.domain
  );
}
