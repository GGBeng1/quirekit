import { hitTestExactQuireLayoutSnapshot } from "./layout-hit";
import type {
  QuireInteractionHitTargetAtPointOptions,
  QuireInteractionHitTargetAtPointResult
} from "./types";
import { resolveQuireRegionSelectionPolicy } from "./selection-policy";

/**
 * Resolves the raw interaction target for a document-space point.
 *
 * The retained layout hit query exposes target provenance before callers
 * interpret the result as a document position or a higher-level selection
 * domain.
 *
 * @param options - Snapshot and document-space point to query.
 * @returns Interaction target hit or miss with geometry provenance.
 */
export function resolveQuireInteractionHitTargetAtPoint(
  options: QuireInteractionHitTargetAtPointOptions
): QuireInteractionHitTargetAtPointResult {
  const hit = hitTestExactQuireLayoutSnapshot({
    snapshot: options.snapshot,
    point: options.point
  });
  const snapshotVersion = options.snapshot.viewGraph?.version;

  if (hit.kind === "miss") {
    return {
      kind: "miss",
      source: "retained-hit-target",
      ...(snapshotVersion === undefined ? {} : { snapshotVersion })
    };
  }

  if (hit.interactionHit !== undefined) {
    const selectionPolicy = resolveQuireRegionSelectionPolicy(
      options.snapshot,
      hit.interactionHit.region
    );

    return {
      kind: "hit",
      targetKind: "interaction-hit",
      source: "retained-hit-target",
      ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
      position: hit.position,
      inside: hit.inside,
      rect: hit.rect,
      interactionHit: hit.interactionHit,
      ...(selectionPolicy === undefined ? {} : { selectionPolicy }),
      ...(hit.viewRegion === undefined ? {} : { viewRegion: hit.viewRegion }),
      ...(hit.queryOwner === undefined ? {} : { queryOwner: hit.queryOwner }),
      ...(hit.interactionScope === undefined
        ? {}
        : { interactionScope: hit.interactionScope }),
      ...(hit.ownerSource === undefined ? {} : { ownerSource: hit.ownerSource }),
      ...(hit.ownerCapabilities === undefined
        ? {}
        : { ownerCapabilities: hit.ownerCapabilities }),
      ...(hit.layer === undefined ? {} : { layer: hit.layer }),
      ...(hit.pointerPolicy === undefined
        ? {}
        : { pointerPolicy: hit.pointerPolicy }),
      ...(hit.layerHitChain === undefined
        ? {}
        : { layerHitChain: hit.layerHitChain }),
      ...(hit.layerTargetIndexQuery === undefined
        ? {}
        : { layerTargetIndexQuery: hit.layerTargetIndexQuery }),
      ...(hit.targetChain === undefined ? {} : { targetChain: hit.targetChain }),
      ...(hit.tableRowOffsetSlot === undefined ? {} : { tableRowOffsetSlot: hit.tableRowOffsetSlot }),
      ...(hit.tableCell === undefined ? {} : { tableCell: hit.tableCell })
    };
  }

  const selectionPolicy = resolveQuireRegionSelectionPolicy(
    options.snapshot,
    hit.viewRegion
  );

  return {
    kind: "hit",
    targetKind: "position",
    source: "retained-hit-target",
    ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
    position: hit.position,
    inside: hit.inside,
    rect: hit.rect,
    ...(selectionPolicy === undefined ? {} : { selectionPolicy }),
    ...(hit.viewRegion === undefined ? {} : { viewRegion: hit.viewRegion }),
    ...(hit.queryOwner === undefined ? {} : { queryOwner: hit.queryOwner }),
    ...(hit.interactionScope === undefined
      ? {}
      : { interactionScope: hit.interactionScope }),
    ...(hit.ownerSource === undefined ? {} : { ownerSource: hit.ownerSource }),
    ...(hit.ownerCapabilities === undefined
      ? {}
      : { ownerCapabilities: hit.ownerCapabilities }),
    ...(hit.layer === undefined ? {} : { layer: hit.layer }),
    ...(hit.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: hit.pointerPolicy }),
    ...(hit.layerHitChain === undefined
      ? {}
      : { layerHitChain: hit.layerHitChain }),
    ...(hit.layerTargetIndexQuery === undefined
      ? {}
      : { layerTargetIndexQuery: hit.layerTargetIndexQuery }),
    ...(hit.targetChain === undefined ? {} : { targetChain: hit.targetChain }),
    ...(hit.tableRowOffsetSlot === undefined ? {} : { tableRowOffsetSlot: hit.tableRowOffsetSlot }),
    ...(hit.tableCell === undefined ? {} : { tableCell: hit.tableCell })
  };
}
