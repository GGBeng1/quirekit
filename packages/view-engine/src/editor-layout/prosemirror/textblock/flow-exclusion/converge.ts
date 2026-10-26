import type {
  ConvergeQuireTextblockFlowShapeOptions,
  QuireTextblockFlowParticipant,
  QuireTextblockFlowShapeConvergenceResult,
  QuireTextblockFlowSlots
} from "./types";

const fullWidthSignature = "full-width";

/**
 * Repeats exclusion shaping until the applied and observed slot signatures agree.
 *
 * @param options - Baseline, pass limit, slot resolver, and shaping callback.
 * @returns Stable fragments or a typed non-convergent result retaining the baseline.
 */
export function convergeQuireTextblockFlowShape(
  options: ConvergeQuireTextblockFlowShapeOptions
): QuireTextblockFlowShapeConvergenceResult {
  let appliedSlots = options.resolveSlots(options.baselineFragments);
  if (appliedSlots === undefined) {
    return { status: "resolved", fragments: options.baselineFragments };
  }

  const participants = new Map<string, QuireTextblockFlowParticipant>();
  const signatures: string[] = [];

  // Each pass applies the preceding geometry, then observes the geometry implied
  // by its own fragments. Equality is the commit boundary; the last frame alone
  // never proves that the coupled paragraph/object system is stable.
  for (let pass = 0; pass < options.maxPasses; pass += 1) {
    retainParticipants(participants, appliedSlots);
    const appliedSignature = appliedSlots?.signature ?? fullWidthSignature;
    signatures.push(appliedSignature);
    const fragments = options.shape(appliedSlots);
    const observedSlots = options.resolveSlots(fragments);
    retainParticipants(participants, observedSlots);
    const observedSignature = observedSlots?.signature ?? fullWidthSignature;
    signatures.push(observedSignature);

    if (observedSignature === appliedSignature) {
      return {
        status: "resolved",
        fragments,
        ...(observedSlots === undefined ? {} : { flowSlots: observedSlots })
      };
    }
    appliedSlots = observedSlots;
  }

  return {
    status: "non-convergent",
    fragments: options.baselineFragments,
    participants: [...participants.values()],
    signatures
  };
}

/**
 * Retains unique participating objects across convergence passes.
 *
 * @param target - Mutable participant index.
 * @param slots - Current slot result, when any.
 */
function retainParticipants(
  target: Map<string, QuireTextblockFlowParticipant>,
  slots: QuireTextblockFlowSlots | undefined
): void {
  for (const participant of slots?.participants ?? []) {
    target.set(participant.sourceAnchorId, participant);
  }
}
