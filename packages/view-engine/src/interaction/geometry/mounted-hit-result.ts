import type { QuireHitTestResult } from "../types";
import {
  createQuireInteractionGeometryDiagnostics
} from "../diagnostics";
import type { QuireInteractionDiagnostics } from "../diagnostics";
import type {
  QuireInteractionNearestCaretAtPointResult,
  QuireInteractionGeometryProvenance,
  QuireInteractionPositionAtPointHit
} from "./types";

/** Geometry point hit shapes that can be exposed through mounted view hit tests. */
type QuireHitTestPositionLike =
  | QuireInteractionPositionAtPointHit
  | Extract<QuireInteractionNearestCaretAtPointResult, { readonly kind: "caret" }>;

/**
 * Maps canonical nearest-caret geometry into the mounted view hit-test result shape.
 *
 * @param result - Canonical nearest-caret point query result.
 * @returns Hit-test result without query-source diagnostics.
 */
export function mapQuireInteractionNearestCaretAtPointToHitTestResult(
  result: QuireInteractionNearestCaretAtPointResult
): QuireHitTestResult {
  if (result.kind === "miss") {
    return {
      kind: "miss",
      diagnostics: createDiagnosticsFromGeometryProvenance(result)
    };
  }

  return mapPositionLikeToHitTestResult(result);
}

/**
 * Maps a position-like interaction geometry answer to the hit-test shape.
 *
 * @param result - Position-like geometry answer.
 * @returns Mounted view hit-test position result.
 */
function mapPositionLikeToHitTestResult(
  result: QuireHitTestPositionLike
): QuireHitTestResult {
  const diagnostics = createDiagnosticsFromGeometryProvenance(result);

  return {
    kind: "position",
    position: result.position,
    inside: result.inside,
    rect: result.rect,
    ...(result.viewRegion === undefined ? {} : { viewRegion: result.viewRegion }),
    ...(result.queryOwner === undefined ? {} : { queryOwner: result.queryOwner }),
    ...(result.interactionScope === undefined
      ? {}
      : { interactionScope: result.interactionScope }),
    ...(result.ownerSource === undefined ? {} : { ownerSource: result.ownerSource }),
    ...(result.ownerCapabilities === undefined
      ? {}
      : { ownerCapabilities: result.ownerCapabilities }),
    ...(result.layer === undefined ? {} : { layer: result.layer }),
    ...(result.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: result.pointerPolicy }),
    ...(result.selectionPolicy === undefined
      ? {}
      : { selectionPolicy: result.selectionPolicy }),
    ...(result.interactionHit === undefined
      ? {}
      : { interactionHit: result.interactionHit }),
    ...(result.tableRowOffsetSlot === undefined
      ? {}
      : { tableRowOffsetSlot: result.tableRowOffsetSlot }),
    ...(result.tableCell === undefined
      ? {}
      : { tableCell: result.tableCell }),
    ...(result.layerHitChain === undefined
      ? {}
      : { layerHitChain: result.layerHitChain }),
    ...(result.layerTargetIndexQuery === undefined
      ? {}
      : { layerTargetIndexQuery: result.layerTargetIndexQuery }),
    ...(result.targetChain === undefined
      ? {}
      : { targetChain: result.targetChain }),
    diagnostics
  };
}

/**
 * Converts geometry provenance into the unified diagnostics shape.
 *
 * @param result - Geometry provenance captured by the interaction facade.
 * @returns Unified diagnostics for hit-test consumers.
 */
function createDiagnosticsFromGeometryProvenance(
  result: QuireInteractionGeometryProvenance
): QuireInteractionDiagnostics {
  return createQuireInteractionGeometryDiagnostics({
    source: result.source,
    ...(result.snapshotVersion === undefined
      ? {}
      : { snapshotVersion: result.snapshotVersion }),
    ...(result.viewRegion === undefined ? {} : { viewRegion: result.viewRegion }),
    ...(result.queryOwner === undefined ? {} : { queryOwner: result.queryOwner }),
    ...(result.layer === undefined ? {} : { layer: result.layer }),
    ...(result.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: result.pointerPolicy }),
    ...(result.interactionHit === undefined
      ? {}
      : { interactionHit: result.interactionHit }),
    ...(result.layerHitChain === undefined
      ? {}
      : { layerHitChain: result.layerHitChain }),
    ...(result.layerTargetIndexQuery === undefined
      ? {}
      : { layerTargetIndexQuery: result.layerTargetIndexQuery }),
    ...(result.targetChain === undefined
      ? {}
      : { targetChain: result.targetChain })
  });
}
