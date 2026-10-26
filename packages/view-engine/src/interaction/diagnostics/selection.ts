import type {
  CreateQuireInteractionCommandRouteDiagnosticsOptions,
  CreateQuireInteractionSelectionTargetDiagnosticsOptions,
  QuireInteractionDiagnostics,
  QuireInteractionSelectionDiagnostics
} from "./types";

/**
 * Creates selection-domain diagnostics from a retained interaction target.
 *
 * @param options - Resolved interaction selection target facts.
 * @returns Unified diagnostics carrying selection, root/region, and retained target facts.
 */
export function createQuireInteractionSelectionTargetDiagnostics(
  options: CreateQuireInteractionSelectionTargetDiagnosticsOptions
): QuireInteractionDiagnostics {
  return {
    selection: createQuireInteractionSelectionDiagnostics(options),
    ...(options.region === undefined
      ? {}
      : {
          rootRegion: {
            root: options.region.rootId,
            region: options.region
          }
        }),
    ...(options.layer === undefined ? {} : { layer: options.layer }),
    ...(options.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: options.pointerPolicy }),
    ...(options.interactionHit === undefined
      ? {}
      : { interactionHit: options.interactionHit })
  };
}

/**
 * Creates selection-domain diagnostics from a routed command.
 *
 * @param options - Selection command route facts and optional dispatch outcome.
 * @returns Unified diagnostics carrying command route and active root/region facts.
 */
export function createQuireInteractionCommandRouteDiagnostics(
  options: CreateQuireInteractionCommandRouteDiagnosticsOptions
): QuireInteractionDiagnostics {
  const interactionTarget = options.interactionTarget;

  return {
    selection: {
      domain: options.selectionDomain,
      commandTarget: options.targetKind,
      ...(interactionTarget === undefined
        ? {}
        : { hitKind: interactionTarget.hitKind }),
      routeKind: options.routeKind,
      intent: options.intent,
      ...(options.consumer === undefined ? {} : { consumer: options.consumer }),
      ...(options.effect === undefined ? {} : { effect: options.effect }),
      ...(options.fallback === undefined ? {} : { fallback: options.fallback })
    },
    ...(options.activeRoot === undefined && options.activeRegion === undefined
      ? {}
      : {
          rootRegion: {
            root: options.activeRoot,
            region: options.activeRegion
          }
        }),
    ...(interactionTarget?.layer === undefined
      ? {}
      : { layer: interactionTarget.layer }),
    ...(interactionTarget?.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: interactionTarget.pointerPolicy }),
    ...(interactionTarget?.interactionHit === undefined
      ? {}
      : { interactionHit: interactionTarget.interactionHit })
  };
}

/**
 * Creates the nested selection diagnostics object.
 *
 * @param options - Selection target facts and optional route facts.
 * @returns Nested selection diagnostics.
 */
export function createQuireInteractionSelectionDiagnostics(
  options: CreateQuireInteractionSelectionTargetDiagnosticsOptions
): QuireInteractionSelectionDiagnostics {
  return {
    domain: options.domain,
    commandTarget: options.commandTarget,
    hitKind: options.hitKind
  };
}

/**
 * Merges nested selection diagnostics while preserving hit and route facts.
 *
 * @param base - Existing selection diagnostics, when present.
 * @param patch - Selection diagnostics to append or override.
 * @returns Merged selection diagnostics, or undefined when neither input exists.
 */
export function mergeQuireInteractionSelectionDiagnostics(
  base: QuireInteractionSelectionDiagnostics | undefined,
  patch: QuireInteractionSelectionDiagnostics | undefined
): QuireInteractionSelectionDiagnostics | undefined {
  if (base === undefined) {
    return patch;
  }

  if (patch === undefined) {
    return base;
  }

  return {
    ...base,
    ...patch
  };
}
