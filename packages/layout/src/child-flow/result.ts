import type {
  CreateQuireChildFlowContinuationOptions,
  CreateQuireChildFlowResultOptions,
  QuireChildFlowContinuation,
  QuireChildFlowResult
} from "./types";

/**
 * Creates one canonical recursive child-flow result.
 *
 * @param options - Complete geometry, identity, continuation, and dependency facts.
 * @returns Consumer-neutral child-flow result.
 */
export function createQuireChildFlowResult(
  options: CreateQuireChildFlowResultOptions
): QuireChildFlowResult {
  return { ...options };
}

/**
 * Creates a continuation for a partially accepted y-driven source band.
 *
 * @param options - Root, accepted band, previous result, and optional owner state.
 * @returns Continuation state, or null when the accepted band reaches the root end.
 */
export function createQuireChildFlowContinuation(
  options: CreateQuireChildFlowContinuationOptions
): QuireChildFlowContinuation | null {
  const sourceFlowBottom = options.sourceFlowBottom ??
    options.root.localRect.y + options.root.localRect.height;

  if (options.acceptedBand.bottom >= sourceFlowBottom) {
    return null;
  }

  return {
    rootId: options.root.id,
    range: options.root.range,
    nextSourceFlowY: options.acceptedBand.bottom,
    previousAcceptedBand: options.acceptedBand,
    remainingSourceFlowBand: {
      top: options.acceptedBand.bottom,
      bottom: sourceFlowBottom
    },
    ...(options.pageIndex === undefined
      ? {}
      : { pageIndex: options.pageIndex }),
    ...(options.parentFragmentId === undefined
      ? {}
      : { parentFragmentId: options.parentFragmentId }),
    previousResultId: options.previousResultId,
    ...(options.adapterState === undefined
      ? {}
      : { adapterState: options.adapterState }),
    dependencySignature: options.root.dependencySignature
  };
}

/**
 * Reports whether a recursive child-flow result is terminal.
 *
 * @param result - Child-flow result to inspect.
 * @returns Whether the result has no continuation.
 */
export function isQuireChildFlowResultComplete(
  result: QuireChildFlowResult
): boolean {
  return result.continuation === null;
}
