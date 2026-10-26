import { resolveQuireTextRangeSelectionSemantics } from "@quirekit/view-engine";
import type { QuireViewPointerRangeSelectionResult } from "../../../types";
import { dispatchQuireViewPointerSelection } from "./result";
import type { SelectQuireViewPointerRangeHitsOptions } from "./types";

/**
 * Applies already-resolved pointer drag endpoints to the editor selection.
 *
 * @param options - PM state, dispatch hook, geometry snapshot, endpoint hits, and hook policy.
 * @returns Pointer range selection result matching the view facade contract.
 */
export function selectQuireViewPointerRangeHits(
  options: SelectQuireViewPointerRangeHitsOptions
): QuireViewPointerRangeSelectionResult {
  const selectionSemantics = resolveQuireTextRangeSelectionSemantics({
    doc: options.state.doc,
    anchorHitTestResult: options.anchorHitTestResult,
    headHitTestResult: options.headHitTestResult,
    ...(options.geometrySnapshot.selectionStructureIndex === undefined
      ? {}
      : {
          structureIndex:
            options.geometrySnapshot.selectionStructureIndex
        }),
    ...(options.createSelectionBetween === undefined
      ? {}
      : { createSelectionBetween: options.createSelectionBetween }),
    tableModel: options.geometrySnapshot.documentProfile?.tableModel
  });

  if (selectionSemantics === null) {
    return {
      geometrySnapshot: options.geometrySnapshot,
      anchorHitTestResult: options.anchorHitTestResult,
      headHitTestResult: options.headHitTestResult,
      updated: false
    };
  }

  const updated = dispatchQuireViewPointerSelection(
    options,
    selectionSemantics.selection
  );

  return {
    geometrySnapshot: options.geometrySnapshot,
    anchorHitTestResult: options.anchorHitTestResult,
    headHitTestResult: options.headHitTestResult,
    updated,
    selectionDomain: selectionSemantics.domain
  };
}
