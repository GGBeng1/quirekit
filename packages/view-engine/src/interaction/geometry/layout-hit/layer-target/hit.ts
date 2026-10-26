import type {
  QuireDocumentPosition,
  QuirePoint
} from "@quirekit/renderer";
import { containsQuirePoint } from "@quirekit/renderer";
import type { QuireHitTarget } from "../../../../layout";
import { mapQuireEditableTextHitTargetPointToCaret } from "../../../text";
import type { QuireHitTestResult } from "../../../types";
import {
  normalizeQuireViewInteractionHitLayerFacts,
  shouldResolveQuireViewLayerTargetAsSelection,
  type QuireViewInteractionHit,
  type QuireViewLayerHitCandidate,
  type QuireViewLayerTargetIndexQueryDiagnostics,
  type QuireViewLayerTargetDecision
} from "../../../../view-graph";
import type {
  QuireLayoutLayerTargetCandidate,
  QuireLayoutLayerTargetHitOptions
} from "./types";

/**
 * Maps a retained target candidate to a mounted position hit result.
 *
 * @param candidate - Candidate that consumed the point.
 * @param options - Snapshot and point being hit-tested.
 * @param layerHitChain - Full retained layer candidate chain.
 * @param layerTargetIndexQuery - Coarse retained layer target query diagnostics.
 * @param targetChain - Decisions evaluated before this hit was produced.
 * @returns Hit-test result for the retained target.
 */
export function mapQuireLayerTargetCandidateToHit(
  candidate: QuireLayoutLayerTargetCandidate,
  options: QuireLayoutLayerTargetHitOptions,
  layerHitChain: readonly QuireViewLayerHitCandidate[],
  layerTargetIndexQuery: QuireViewLayerTargetIndexQueryDiagnostics,
  targetChain: readonly QuireViewLayerTargetDecision[]
): QuireHitTestResult {
  const { target } = candidate;
  const textTarget = mapQuireEditableTextHitTargetPointToCaret({
    nodes: options.snapshot.root.children ?? [],
    range: target.range,
    rect: target.rect,
    point: options.point
  });
  // View Graph owns fact precedence; a structural target does not invent a hit.
  const interactionHit = target.interactionHit === undefined
    ? undefined
    : normalizeQuireViewInteractionHitLayerFacts(target.interactionHit, candidate);
  const resolvedInteractionHit = shouldDelegateCellHitToEditableText(
    interactionHit,
    textTarget,
    options.point
  )
    ? undefined
    : interactionHit;
  const isSelectionTarget = shouldResolveQuireViewLayerTargetAsSelection(
    candidate
  );

  return {
    kind: "position",
    position: textTarget?.position ??
      mapQuireLayerTargetPointToDocumentPosition(target, options.point),
    inside: isSelectionTarget ? textTarget?.inside ?? target.range.from : target.range.from,
    rect: isSelectionTarget ? textTarget?.rect ?? target.rect : target.rect,
    ...(target.viewRegion === undefined && resolvedInteractionHit === undefined
      ? {}
      : { viewRegion: target.viewRegion ?? resolvedInteractionHit?.region }),
    ...(target.queryOwner === undefined ? {} : { queryOwner: target.queryOwner }),
    ...(target.interactionScope === undefined
      ? {}
      : { interactionScope: target.interactionScope }),
    ...(target.source === undefined ? {} : { ownerSource: target.source }),
    ...(target.capabilities === undefined
      ? {}
      : { ownerCapabilities: target.capabilities }),
    ...(resolvedInteractionHit === undefined
      ? {}
      : { interactionHit: resolvedInteractionHit }),
    layer: candidate.layer,
    pointerPolicy: candidate.pointerPolicy,
    layerHitChain,
    layerTargetIndexQuery,
    targetChain
  };
}

/**
 * Checks whether a structural cell surface resolved an editable text caret.
 *
 * Cell targets cover the complete visual box so blank areas remain editable,
 * but they must not keep cell-selection command semantics after the shared text
 * mapper has found a concrete caret. The exact position then becomes the
 * authority for both selection and command routing.
 *
 * @param interactionHit - Structural interaction hit carried by the layer target.
 * @param textTarget - Editable text mapping resolved inside the target bounds.
 * @param point - Document-space pointer point being resolved.
 * @returns Whether the layer hit should expose position semantics instead.
 */
function shouldDelegateCellHitToEditableText(
  interactionHit: QuireViewInteractionHit | undefined,
  textTarget: ReturnType<typeof mapQuireEditableTextHitTargetPointToCaret>,
  point: QuirePoint
): boolean {
  return interactionHit?.kind === "cell"
    && textTarget !== null
    && containsQuirePoint(textTarget.rect, point);
}

/**
 * Maps a target point to the nearest structural side of the target range.
 *
 * @param target - Layout hit target containing the point.
 * @param point - Document-space point being mapped.
 * @returns Nearest structural document position.
 */
function mapQuireLayerTargetPointToDocumentPosition(
  target: QuireHitTarget,
  point: QuirePoint
): QuireDocumentPosition {
  const midpoint = target.rect.x + target.rect.width / 2;

  return point.x <= midpoint
    ? { pos: target.range.from, bias: 1 }
    : { pos: target.range.to, bias: -1 };
}
