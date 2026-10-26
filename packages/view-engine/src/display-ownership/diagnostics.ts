import type {
  QuireDisplayInvalidationProjection,
  QuireRetainedDisplayOwnerDiagnostics,
  QuireRetainedDisplayOwnerIndex
} from "./types";

/** Inputs for one retained display-owner diagnostic snapshot. */
export interface CreateQuireRetainedDisplayOwnerDiagnosticsOptions {
  /** Compiled retained display-owner graph. */
  readonly ownerIndex: QuireRetainedDisplayOwnerIndex;
  /** Number of direct owner chunks realized this render. */
  readonly ownerChunkCount: number;
  /** Typed invalidation projection for the current update. */
  readonly invalidation: QuireDisplayInvalidationProjection;
  /** Number of observer bridges used by display-list production. */
  readonly observerBridgeUses: number;
}

/**
 * Creates diagnostics from canonical owner products and typed invalidation.
 *
 * @param options - Owner graph, chunks, invalidation, and bridge usage.
 * @returns Immutable retained display-owner diagnostics.
 */
export function createQuireRetainedDisplayOwnerDiagnostics(
  options: CreateQuireRetainedDisplayOwnerDiagnosticsOptions
): QuireRetainedDisplayOwnerDiagnostics {
  const rebuiltOwnerKeys = new Set(
    options.invalidation.owners.map((owner) => owner.ownerKey)
  );
  let projectedContentLanes = 0;
  let projectedOverlayLanes = 0;
  for (const owner of options.invalidation.owners) {
    projectedContentLanes += owner.lanes.includes("content") ? 1 : 0;
    projectedOverlayLanes += owner.lanes.includes("overlay") ? 1 : 0;
  }
  return {
    compiledOwners: options.ownerIndex.owners.length,
    contentOwners: options.ownerIndex.owners.filter((owner) =>
      owner.lanes.includes("content")
    ).length,
    overlayOwners: options.ownerIndex.owners.filter((owner) =>
      owner.lanes.includes("overlay")
    ).length,
    directOwnerChunks: options.ownerChunkCount,
    rebuiltOwners: rebuiltOwnerKeys.size,
    reusedOwners: Math.max(0, options.ownerIndex.owners.length - rebuiltOwnerKeys.size),
    projectedContentLanes,
    projectedOverlayLanes,
    gapCodes: options.ownerIndex.gaps.map((gap) => gap.code),
    escalationCodes: options.invalidation.escalations.map((escalation) => escalation.code),
    observerBridgeUses: options.observerBridgeUses
  };
}
