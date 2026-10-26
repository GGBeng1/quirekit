import {
  hitTestNearestCaretInQuireLayoutRegion,
  hitTestNearestCaretInQuireLayoutSnapshot
} from "./layout-hit";
import type {
  QuireInteractionNearestCaretAtPointOptions,
  QuireInteractionNearestCaretAtPointResult
} from "./types";
import { resolveQuireRegionSelectionPolicy } from "./selection-policy";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireHitTestResult } from "../types";

/**
 * Resolves the nearest caret from a document-space point.
 *
 * This is the canonical interaction-geometry entry point for pointer selection
 * paths that may clamp document blanks to editable text.
 *
 * @param options - Snapshot and document-space point to query.
 * @returns Nearest caret hit or miss with geometry provenance.
 */
export function resolveQuireInteractionNearestCaretAtPoint(
  options: QuireInteractionNearestCaretAtPointOptions
): QuireInteractionNearestCaretAtPointResult {
  const hit = options.region === undefined
    ? hitTestNearestCaretInQuireLayoutSnapshot({
        snapshot: options.snapshot,
        point: options.point
      })
    : hitTestNearestCaretInQuireLayoutRegion({
        snapshot: options.snapshot,
        point: options.point,
        region: options.region
      });
  return createQuireInteractionNearestCaretResult(options.snapshot, hit);
}

/**
 * Wraps an accepted caret hit without dropping its retained routing identity.
 * @param snapshot - Snapshot owning the accepted hit and selection policies.
 * @param hit - Position hit or miss produced by an admitted caret query.
 * @returns Nearest-caret geometry with complete existing provenance.
 */
export function createQuireInteractionNearestCaretResult(
  snapshot: QuireLayoutSnapshot,
  hit: QuireHitTestResult
): QuireInteractionNearestCaretAtPointResult {
  const snapshotVersion = snapshot.viewGraph?.version;

  if (hit.kind === "miss") {
    return {
      kind: "miss",
      source: "retained-nearest-caret",
      ...(snapshotVersion === undefined ? {} : { snapshotVersion })
    };
  }

  const selectionPolicy = resolveQuireRegionSelectionPolicy(
    snapshot,
    hit.queryOwner?.region ?? hit.interactionHit?.region ?? hit.viewRegion
  );

  return {
    kind: "caret",
    source: "retained-nearest-caret",
    ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
    position: hit.position,
    inside: hit.inside,
    rect: hit.rect,
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
    ...(selectionPolicy === undefined ? {} : { selectionPolicy }),
    ...(hit.interactionHit === undefined
      ? {}
      : { interactionHit: hit.interactionHit }),
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
