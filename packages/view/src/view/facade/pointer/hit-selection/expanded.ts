import { resolveQuireTextExpandedSelectionSemantics } from "@quirekit/view-engine";
import type { QuireViewPointerSelectionResult } from "../../../types";
import {
  createQuireViewPointerHitSelectionResult,
  dispatchQuireViewPointerSelection
} from "./result";
import type { SelectQuireViewPointerExpandedHitOptions } from "./types";

/**
 * Applies an expanded range selection from an already-resolved pointer hit.
 *
 * @param options - PM state, dispatch hook, geometry snapshot, pointer hit, and range kind.
 * @returns Pointer hit selection result matching the view facade contract.
 */
export function selectQuireViewPointerExpandedHit(
  options: SelectQuireViewPointerExpandedHitOptions
): QuireViewPointerSelectionResult {
  const selectionSemantics = resolveQuireTextExpandedSelectionSemantics({
    doc: options.state.doc,
    snapshot: options.geometrySnapshot,
    hitTestResult: options.hitTestResult,
    kind: options.kind
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
