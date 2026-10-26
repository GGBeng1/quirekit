import { buildQuireSelectionGeometry } from "@quirekit/view-engine";
import { createMountedSelectionGeometryRenderResult } from "./geometry";
import type { CreateMountedSelectionUpdateRenderResultOptions } from "./types";
import type { QuireViewRenderResult } from "../../../types";

/**
 * Builds the shared render-result patch for mounted overlay-only selection updates.
 *
 * @param options - Previous result, current editor state, and overlay render inputs.
 * @returns Render result with updated selection geometry and overlay display list.
 */
export function createMountedSelectionUpdateRenderResult(
  options: CreateMountedSelectionUpdateRenderResultOptions
): QuireViewRenderResult {
  const previous = options.previousRenderResult;
  const snapshot = {
    ...previous.layoutSnapshot,
    state: options.state
  };
  const selectionGeometry = buildQuireSelectionGeometry({
    snapshot,
    ...(options.selectionContext === undefined
      ? {}
      : { selectionContext: options.selectionContext })
  });

  return createMountedSelectionGeometryRenderResult({
    ...options,
    layoutSnapshot: snapshot,
    layoutDirtyRange: null,
    updatePatch: options.updatePatch,
    selectionGeometry
  });
}
