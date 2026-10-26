import {
  createQuireInteractionSelectionTargetDiagnostics,
  hitTestQuirePointerNearestCaret,
  resolveQuireHitTestSelectionTarget,
  withQuireInteractionDiagnostics
} from "@quirekit/view-engine";
import type {
  QuireClientPoint,
  QuireClientRect,
  QuireHitTestResult
} from "@quirekit/view-engine";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireViewPointerHitTestResult,
  QuireViewPointerSelectionOptions
} from "../../types";

/**
 * Hit-tests one client point against an already resolved pointer geometry snapshot.
 *
 * @param options - Geometry snapshot, client point, and mounted surface projection.
 * @returns Nearest-caret hit-test result for the client point.
 */
export function hitTestQuireViewPointerNearestCaretInGeometry(options: {
  readonly geometrySnapshot: QuireLayoutSnapshot;
  readonly clientPoint: QuireClientPoint;
  readonly canvasClientRect: QuireClientRect;
  readonly surfaceBounds?: QuireRect | undefined;
}): QuireHitTestResult {
  const hitTestResult = hitTestQuirePointerNearestCaret({
    snapshot: options.geometrySnapshot,
    clientPoint: options.clientPoint,
    canvasClientRect: options.canvasClientRect,
    ...(options.surfaceBounds === undefined
      ? {}
      : { surfaceBounds: options.surfaceBounds })
  });
  const interactionTarget = resolveQuireHitTestSelectionTarget({ hitTestResult });

  return interactionTarget === null
    ? hitTestResult
    : withQuireInteractionDiagnostics(
        hitTestResult,
        createQuireInteractionSelectionTargetDiagnostics(interactionTarget)
      );
}

/**
 * Resolves a nearest-caret hit from a retained pointer geometry snapshot.
 *
 * @param options - Pointer options with retained geometry and mounted surface projection.
 * @param clientPoint - Browser client point to map into document space.
 * @returns Pointer hit-test result and the geometry snapshot used to produce it.
 */
export function resolveQuireViewPointerNearestCaretHit(
  options: QuireViewPointerSelectionOptions,
  clientPoint: QuireClientPoint
): QuireViewPointerHitTestResult {
  const geometrySnapshot = options.geometrySnapshot;

  const hitTestResult = hitTestQuireViewPointerNearestCaretInGeometry({
    geometrySnapshot,
    clientPoint,
    canvasClientRect: options.canvasClientRect,
    ...(options.surfaceBounds === undefined
      ? {}
      : { surfaceBounds: options.surfaceBounds })
  });

  return {
    geometrySnapshot,
    hitTestResult,
    interactionTarget: resolveQuireHitTestSelectionTarget({ hitTestResult })
  };
}
