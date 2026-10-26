import { resolveQuireInteractionHitTargetAtPoint } from "./hit-target";
import type {
  QuireInteractionPositionAtPointOptions,
  QuireInteractionPositionAtPointResult
} from "./types";

/**
 * Resolves a document position from a document-space point.
 *
 * This is the canonical interaction-geometry entry point for point-to-position
 * queries. It attaches retained provenance so callers can consume
 * authority-owned geometry contracts.
 *
 * @param options - Snapshot and document-space point to query.
 * @returns Position hit or miss with geometry provenance.
 */
export function resolveQuireInteractionPositionAtPoint(
  options: QuireInteractionPositionAtPointOptions
): QuireInteractionPositionAtPointResult {
  const target = resolveQuireInteractionHitTargetAtPoint({
    snapshot: options.snapshot,
    point: options.point
  });

  if (target.kind === "miss") {
    return {
      kind: "miss",
      source: "retained-position",
      ...(target.snapshotVersion === undefined
        ? {}
        : { snapshotVersion: target.snapshotVersion })
    };
  }

  return {
    kind: "position",
    source: "retained-position",
    ...(target.snapshotVersion === undefined
      ? {}
      : { snapshotVersion: target.snapshotVersion }),
    position: target.position,
    inside: target.inside,
    rect: target.rect,
    ...(target.viewRegion === undefined ? {} : { viewRegion: target.viewRegion }),
    ...(target.queryOwner === undefined ? {} : { queryOwner: target.queryOwner }),
    ...(target.interactionScope === undefined
      ? {}
      : { interactionScope: target.interactionScope }),
    ...(target.ownerSource === undefined ? {} : { ownerSource: target.ownerSource }),
    ...(target.ownerCapabilities === undefined
      ? {}
      : { ownerCapabilities: target.ownerCapabilities }),
    ...(target.layer === undefined ? {} : { layer: target.layer }),
    ...(target.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: target.pointerPolicy }),
    ...(target.selectionPolicy === undefined
      ? {}
      : { selectionPolicy: target.selectionPolicy }),
    ...(target.targetKind === "position"
      ? {}
      : { interactionHit: target.interactionHit }),
    ...(target.layerHitChain === undefined
      ? {}
      : { layerHitChain: target.layerHitChain }),
    ...(target.layerTargetIndexQuery === undefined
      ? {}
      : { layerTargetIndexQuery: target.layerTargetIndexQuery }),
    ...(target.targetChain === undefined
      ? {}
      : { targetChain: target.targetChain }),
    ...(target.tableRowOffsetSlot === undefined
      ? {}
      : { tableRowOffsetSlot: target.tableRowOffsetSlot }),
    ...(target.tableCell === undefined ? {} : { tableCell: target.tableCell })
  };
}
