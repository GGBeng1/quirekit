import type {
  QuireViewLayerHitCandidate,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../types";
import { resolveQuireViewLayerPlaneDescriptor } from "./stack";

/**
 * Resolves the default pointer policy for one retained visual layer.
 *
 * @param layer - Retained layer reference to classify.
 * @returns Default pointer policy for targets on the layer.
 */
export function resolveDefaultQuireViewPointerPolicyForLayer(
  layer: QuireViewLayerRef
): QuireViewPointerPolicy {
  return resolveQuireViewLayerPlaneDescriptor(layer.plane)
    .defaultPointerPolicy;
}

/**
 * Compares two retained hit candidates for pointer routing.
 *
 * @param left - First candidate to compare.
 * @param right - Second candidate to compare.
 * @returns Negative when `left` should be evaluated before `right`.
 */
export function compareQuireViewLayerHitCandidates(
  left: QuireViewLayerHitCandidate,
  right: QuireViewLayerHitCandidate
): number {
  return (
    resolveQuireViewLayerPlaneDescriptor(right.layer.plane).hitTestOrder -
      resolveQuireViewLayerPlaneDescriptor(left.layer.plane).hitTestOrder ||
    (right.layer.zIndex ?? 0) - (left.layer.zIndex ?? 0) ||
    (right.layer.priority ?? 0) - (left.layer.priority ?? 0) ||
    measureQuireLayerHitCandidateArea(left) -
      measureQuireLayerHitCandidateArea(right) ||
    left.targetId.localeCompare(right.targetId)
  );
}

/**
 * Measures a candidate target area for specificity ordering.
 *
 * @param candidate - Candidate whose rectangle should be measured.
 * @returns Non-negative document-space area.
 */
function measureQuireLayerHitCandidateArea(
  candidate: QuireViewLayerHitCandidate
): number {
  return candidate.rect.width * candidate.rect.height;
}
