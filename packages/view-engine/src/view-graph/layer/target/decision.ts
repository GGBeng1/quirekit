import type {
  QuireViewLayerHitCandidate,
  QuireViewLayerTargetDecision,
  QuireViewPointerPolicy
} from "../../types";

/**
 * Creates a target-chain decision for one retained layer candidate.
 *
 * @param candidate - Candidate being evaluated.
 * @returns Canonical pointer-policy decision for diagnostics and routing.
 */
export function createQuireViewLayerTargetDecision(
  candidate: QuireViewLayerHitCandidate
): QuireViewLayerTargetDecision {
  return {
    targetId: candidate.targetId,
    decision: mapQuireViewPointerPolicyToLayerDecision(
      candidate.pointerPolicy
    ),
    layer: candidate.layer,
    pointerPolicy: candidate.pointerPolicy
  };
}

/**
 * Reports whether a retained target should resolve text selection geometry.
 *
 * @param candidate - Retained layer candidate being mapped to a hit result.
 * @returns Whether the target should use text caret geometry instead of structural bounds.
 */
export function shouldResolveQuireViewLayerTargetAsSelection(
  candidate: QuireViewLayerHitCandidate
): boolean {
  return candidate.pointerPolicy.kind === "select";
}

/**
 * Maps a pointer policy to the retained target-chain decision label.
 *
 * @param pointerPolicy - Pointer policy to classify.
 * @returns Diagnostic target decision.
 */
function mapQuireViewPointerPolicyToLayerDecision(
  pointerPolicy: QuireViewPointerPolicy
): QuireViewLayerTargetDecision["decision"] {
  switch (pointerPolicy.kind) {
    case "select":
      return "selected";
    case "dispatch":
      return "target-dispatch";
    case "focus-only":
      return "focus-only";
    case "pass-through":
      return "pass-through";
  }
}
