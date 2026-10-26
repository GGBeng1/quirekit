import { containsQuireTargetPoint } from "@quirekit/renderer";
import type { QuireHitTarget } from "../../../../layout";
import {
  queryQuireViewLayerTargetIndexAtPointWithDiagnostics,
  resolveQuireViewLayerTargetFacts,
  shouldRouteQuireViewLayerTarget,
  type QuireViewLayerHitCandidate
} from "../../../../view-graph";
import type {
  QuireLayoutLayerTargetCandidateCollection,
  QuireLayoutLayerTargetCandidateSources,
  QuireLayoutLayerTargetCandidate,
  QuireLayoutLayerTargetHitOptions
} from "./types";
import { readQuireLayerTargetMap } from "./target-map";

/**
 * Collects retained target candidates that contain the queried point.
 *
 * @param options - Snapshot and point to test.
 * @returns Candidate targets eligible for retained layer routing.
 */
export function collectQuireLayerTargetCandidatesAtPoint(
  options: QuireLayoutLayerTargetHitOptions
): QuireLayoutLayerTargetCandidateCollection {
  const candidates: QuireLayoutLayerTargetCandidate[] = [];
  const candidateSources = readQuireLayerTargetCandidateSources(options);

  for (const target of candidateSources.targets) {
    if (!containsQuireTargetPoint(target.rect, target.hitArea, options.point)) {
      continue;
    }

    const facts = resolveQuireViewLayerTargetFacts(target);

    if (
      !shouldRouteQuireViewLayerTarget({
        targetId: target.id,
        ...facts,
        rect: target.rect,
        hasInteractionHit: target.interactionHit !== undefined
      })
    ) {
      continue;
    }

    candidates.push({
      targetId: target.id,
      target,
      ...facts,
      rect: target.rect
    });
  }

  return {
    candidates,
    layerTargetIndexQuery: candidateSources.layerTargetIndexQuery
  };
}

/**
 * Reads the retained hit targets eligible for exact layer inspection.
 *
 * @param options - Snapshot and point query options.
 * @returns Hit targets narrowed by the retained layer index when present.
 */
function readQuireLayerTargetCandidateSources(
  options: QuireLayoutLayerTargetHitOptions
): QuireLayoutLayerTargetCandidateSources {
  const index = options.snapshot.layerTargetIndex;

  if (index === undefined) {
    const targetIds = options.snapshot.hitTargets.map((target) => target.id);

    return {
      targets: options.snapshot.hitTargets,
      layerTargetIndexQuery: {
        targetIds,
        buckets: [],
        unbucketedTargetIds: targetIds,
        source: "unindexed-layer-target-scan"
      }
    };
  }

  const targetById = readQuireLayerTargetMap(options.snapshot);
  const layerTargetIndexQuery = queryQuireViewLayerTargetIndexAtPointWithDiagnostics(
    index,
    options.point
  );

  return {
    targets: layerTargetIndexQuery.targetIds
      .map((targetId) => targetById.get(targetId))
      .filter((target): target is QuireHitTarget => target !== undefined),
    layerTargetIndexQuery
  };
}

/**
 * Removes layout-target ownership from a retained layer candidate.
 *
 * @param candidate - Internal candidate to expose in diagnostics.
 * @returns Public retained layer hit candidate.
 */
export function toQuireViewLayerHitCandidate(
  candidate: QuireLayoutLayerTargetCandidate
): QuireViewLayerHitCandidate {
  return {
    targetId: candidate.targetId,
    layer: candidate.layer,
    pointerPolicy: candidate.pointerPolicy,
    rect: candidate.rect
  };
}
