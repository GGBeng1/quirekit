import { readQuireViewLayerTargetFacts } from "../../../view-graph";
import type { QuirePositionHitTestResult } from "../../types";
import type { QuireSubLayoutHitTarget, QuireSubLayoutPositionGeometry } from "../types";

/**
 * Attaches retained target metadata to geometry chosen by a hit strategy.
 *
 * @param geometry - Resolved position, rectangle and optional exact caret owner.
 * @param target - Matching target, if one exists for the resolved caret.
 * @returns Position hit preserving caret ownership and target routing facts.
 */
export function buildQuireSubLayoutPositionHit(
  geometry: QuireSubLayoutPositionGeometry,
  target?: QuireSubLayoutHitTarget
): QuirePositionHitTestResult {
  const facts = target === undefined ? undefined : readQuireViewLayerTargetFacts(target);
  const queryOwner = geometry.queryOwner ?? target?.queryOwner;
  const viewRegion = target?.viewRegion ?? geometry.viewRegion;

  return {
    kind: "position",
    position: geometry.position,
    rect: geometry.rect,
    inside: target?.range.from ?? geometry.position.pos,
    ...(queryOwner === undefined ? {} : { queryOwner }),
    ...(viewRegion === undefined ? {} : { viewRegion }),
    ...(target?.source === undefined ? {} : { ownerSource: target.source }),
    ...(target?.capabilities === undefined ? {} : { ownerCapabilities: target.capabilities }),
    ...(facts === undefined ? {} : { layer: facts.layer, pointerPolicy: facts.pointerPolicy }),
    ...(target?.interactionHit === undefined ? {} : { interactionHit: target.interactionHit })
  };
}
