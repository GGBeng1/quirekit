import type {
  QuireInteractionCoordinatePathDiagnostics,
  QuireInteractionDiagnostics,
  CreateQuireInteractionCoordinatePathDiagnosticsOptions,
  CreateQuireInteractionGeometryDiagnosticsOptions
} from "./types";
import {
  createQuireInteractionFallbackUsage,
  mergeQuireInteractionFallbacks
} from "./fallback";
import {
  mergeQuireInteractionSelectionDiagnostics
} from "./selection";

/**
 * Creates coordinate-path diagnostics for a browser pointer query.
 *
 * @param options - Client point, surface projection, and resolved document point.
 * @returns Coordinate-path diagnostics used by interaction summaries.
 */
export function createQuireInteractionCoordinatePathDiagnostics(
  options: CreateQuireInteractionCoordinatePathDiagnosticsOptions
): QuireInteractionCoordinatePathDiagnostics {
  return {
    spaces: options.path.spaces,
    path: options.path,
    clientPoint: options.clientPoint,
    surfaceClientRect: options.surfaceClientRect,
    surfaceBounds: options.surfaceBounds,
    documentPoint: options.documentPoint
  };
}

/**
 * Creates a unified interaction diagnostic summary from geometry provenance.
 *
 * @param options - Geometry provenance and retained target diagnostics.
 * @returns Unified interaction diagnostic summary.
 */
export function createQuireInteractionGeometryDiagnostics(
  options: CreateQuireInteractionGeometryDiagnosticsOptions
): QuireInteractionDiagnostics {
  const passThroughDecisions = options.targetChain?.filter(
    (decision) => decision.decision === "pass-through"
  );
  const fallback = createQuireInteractionFallbackUsage(options.source);

  return {
    querySource: options.source,
    ...(options.snapshotVersion === undefined
      ? {}
      : { snapshotVersion: options.snapshotVersion }),
    ...(options.viewRegion === undefined &&
      options.interactionHit === undefined &&
      options.queryOwner?.region === undefined
      ? {}
      : {
          rootRegion: {
            root: options.viewRegion?.rootId ??
              options.interactionHit?.region.rootId ??
              options.queryOwner?.region?.rootId,
            region: options.viewRegion ??
              options.interactionHit?.region ??
              options.queryOwner?.region
          }
        }),
    ...(options.queryOwner === undefined
      ? {}
      : { queryOwner: options.queryOwner }),
    ...(options.layer === undefined ? {} : { layer: options.layer }),
    ...(options.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: options.pointerPolicy }),
    ...(options.interactionHit === undefined
      ? {}
      : { interactionHit: options.interactionHit }),
    ...(options.layerHitChain === undefined
      ? {}
      : { layerHitChain: options.layerHitChain }),
    ...(options.layerTargetIndexQuery === undefined
      ? {}
      : { layerTargetIndexQuery: options.layerTargetIndexQuery }),
    ...(options.targetChain === undefined
      ? {}
      : { targetChain: options.targetChain }),
    ...(passThroughDecisions === undefined || passThroughDecisions.length === 0
      ? {}
      : { passThroughDecisions }),
    ...(fallback === undefined ? {} : { migrationFallbacks: [fallback] })
  };
}

/**
 * Merges interaction diagnostics without dropping existing nested evidence.
 *
 * @param base - Existing diagnostic summary, when present.
 * @param patch - New diagnostic facts to append or override.
 * @returns Merged diagnostics, or undefined when both inputs are absent.
 */
export function mergeQuireInteractionDiagnostics(
  base: QuireInteractionDiagnostics | undefined,
  patch: QuireInteractionDiagnostics | undefined
): QuireInteractionDiagnostics | undefined {
  if (base === undefined) {
    return patch;
  }

  if (patch === undefined) {
    return base;
  }

  const migrationFallbacks = mergeQuireInteractionFallbacks(
    base.migrationFallbacks,
    patch.migrationFallbacks
  );
  const selection = mergeQuireInteractionSelectionDiagnostics(
    base.selection,
    patch.selection
  );
  const regionProductGaps = [
    ...(base.regionProductGaps ?? []),
    ...(patch.regionProductGaps ?? [])
  ];
  const inlinePlacementGaps = [
    ...(base.inlinePlacementGaps ?? []),
    ...(patch.inlinePlacementGaps ?? [])
  ];

  return {
    ...base,
    ...patch,
    ...(selection === undefined ? {} : { selection }),
    ...(migrationFallbacks.length === 0 ? {} : { migrationFallbacks }),
    ...(regionProductGaps.length === 0 ? {} : { regionProductGaps }),
    ...(inlinePlacementGaps.length === 0 ? {} : { inlinePlacementGaps })
  };
}

/**
 * Adds or merges interaction diagnostics onto a result object.
 *
 * @param value - Result object that may already carry diagnostics.
 * @param diagnostics - Diagnostic facts to merge into the result.
 * @returns Result with merged diagnostics.
 */
export function withQuireInteractionDiagnostics<
  T extends { readonly diagnostics?: QuireInteractionDiagnostics | undefined }
>(
  value: T,
  diagnostics: QuireInteractionDiagnostics | undefined
): T {
  const merged = mergeQuireInteractionDiagnostics(
    value.diagnostics,
    diagnostics
  );

  return merged === undefined
    ? value
    : {
        ...value,
        diagnostics: merged
      };
}
