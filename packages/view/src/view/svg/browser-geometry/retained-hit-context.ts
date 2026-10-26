import {
  hitTestQuirePointerNearestCaret,
  mapClientPointToQuirePoint,
  withQuireInteractionDiagnostics
} from "@quirekit/view-engine";
import { clampSvgBrowserHitClientPointToHorizontalSurface } from "./hit/coordinate";
import type {
  SvgBrowserMeasurementHitContext,
  SvgBrowserMeasurementHitContextOptions
} from "./types";

/**
 * Resolves retained hit context facts for SVG browser hit measurement.
 *
 * SVG text measurement may refine the character boundary, but the retained hit,
 * owner identity, coordinate path, and diagnostics must come from shared
 * interaction geometry first.
 *
 * @param options - Geometry snapshot, pointer point, and surface projection.
 * @returns Retained hit context facts accepted by SVG browser measurement.
 */
export function resolveSvgBrowserMeasurementHitContext(
  options: SvgBrowserMeasurementHitContextOptions
): SvgBrowserMeasurementHitContext {
  const clientPoint = clampSvgBrowserHitClientPointToHorizontalSurface(
    options.clientPoint,
    options.surfaceClientRect
  );
  const projectionOptions = {
    clientPoint,
    canvasClientRect: options.surfaceClientRect,
    ...(options.surfaceBounds === undefined
      ? {}
      : { surfaceBounds: options.surfaceBounds })
  };
  const hitTestResult = hitTestQuirePointerNearestCaret({
    snapshot: options.geometrySnapshot,
    ...projectionOptions
  });

  return {
    clientPoint,
    documentPoint: mapClientPointToQuirePoint(projectionOptions),
    hitTestResult: withQuireInteractionDiagnostics(hitTestResult, {
      migrationFallbacks: [
        {
          kind: "svg-browser-measurement-refinement",
          reason: "SVG browser measurement refines this shared retained nearest-caret context."
        }
      ]
    })
  };
}
