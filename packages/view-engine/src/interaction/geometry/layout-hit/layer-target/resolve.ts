import {
  compareQuireViewLayerHitCandidates,
  createQuireViewLayerTargetDecision,
  type QuireViewLayerTargetDecision
} from "../../../../view-graph";
import type { QuireHitTestResult } from "../../../types";
import {
  collectQuireLayerTargetCandidatesAtPoint,
  toQuireViewLayerHitCandidate
} from "./candidates";
import { mapQuireLayerTargetCandidateToHit } from "./hit";
import type {
  QuireLayoutLayerTargetHitOptions,
  QuireLayoutLayerTargetHitResult
} from "./types";

/**
 * Resolves retained layer targets before normal layout hit-test fallback.
 *
 * @param options - Snapshot and point to test.
 * @returns Consuming layer hit, or pass-through diagnostics for fallback hits.
 */
export function hitTestQuireLayerTargetsAtPoint(
  options: QuireLayoutLayerTargetHitOptions
): QuireLayoutLayerTargetHitResult {
  const candidateCollection = collectQuireLayerTargetCandidatesAtPoint(options);
  const candidates = [...candidateCollection.candidates];

  const sortedCandidates = candidates.sort(compareQuireViewLayerHitCandidates);
  const layerHitChain = sortedCandidates.map(toQuireViewLayerHitCandidate);
  const targetChain: QuireViewLayerTargetDecision[] = [];

  for (const candidate of sortedCandidates) {
    const decision = createQuireViewLayerTargetDecision(candidate);

    targetChain.push(decision);

    if (decision.decision === "pass-through") {
      continue;
    }

    return {
      hit: mapQuireLayerTargetCandidateToHit(
        candidate,
        options,
        layerHitChain,
        candidateCollection.layerTargetIndexQuery,
        targetChain
      ),
      layerHitChain,
      layerTargetIndexQuery: candidateCollection.layerTargetIndexQuery,
      targetChain
    };
  }

  return {
    hit: null,
    layerHitChain,
    layerTargetIndexQuery: candidateCollection.layerTargetIndexQuery,
    targetChain
  };
}

/**
 * Adds retained pass-through diagnostics to a fallback layout hit.
 *
 * @param hit - Fallback hit produced after retained targets passed through.
 * @param layerHit - Retained layer hit-test result to attach.
 * @returns Hit with retained target diagnostics when available.
 */
export function withQuireLayerTargetDiagnostics(
  hit: QuireHitTestResult,
  layerHit: QuireLayoutLayerTargetHitResult
): QuireHitTestResult {
  if (
    hit.kind === "miss" ||
    (
      layerHit.layerHitChain.length === 0 &&
      layerHit.targetChain.length === 0 &&
      layerHit.layerTargetIndexQuery.source === "unindexed-layer-target-scan"
    )
  ) {
    return hit;
  }

  return {
    ...hit,
    layerHitChain: layerHit.layerHitChain,
    layerTargetIndexQuery: layerHit.layerTargetIndexQuery,
    targetChain: layerHit.targetChain
  };
}
