import type {
  QuireLayoutProviderContext,
  QuireLayoutProviderContinuation
} from "@quirekit/view-engine/layout-provider";

/** Immutable provider-owned geometry accepted against parent constraints. */
export interface FloatingObjectPlan {
  /** Accepted object width. */
  readonly width: number;
  /** Requested minimum height. */
  readonly minHeight: number;
  /** Accepted inline offset. */
  readonly inlineOffset: number;
  /** Accepted block offset. */
  readonly blockOffset: number;
}

/**
 * Reads a reusable plan only when exact source and dependencies still match.
 *
 * @param context - Current versioned provider execution.
 * @param dependencySignature - Current geometry dependency signature.
 * @returns Accepted immutable plan, when reusable.
 */
export function readFloatingObjectContinuation(
  context: QuireLayoutProviderContext,
  dependencySignature: string
): FloatingObjectPlan | undefined {
  const previous = context.previousContinuation;
  if (
    previous?.providerId !== context.providerId
    || previous.dependencySignature !== dependencySignature
    || previous.source.sourceId !== context.source.sourceId
  ) {
    return undefined;
  }
  const state = previous.state;
  return isPositiveFiniteNumber(state.width)
    && isPositiveFiniteNumber(state.minHeight)
    && isNonNegativeFiniteNumber(state.inlineOffset)
    && isNonNegativeFiniteNumber(state.blockOffset)
    ? {
        width: state.width,
        minHeight: state.minHeight,
        inlineOffset: state.inlineOffset,
        blockOffset: state.blockOffset
      }
    : undefined;
}

/**
 * Creates immutable continuation state for a successful provider execution.
 *
 * @param context - Current versioned provider execution.
 * @param dependencySignature - Exact geometry dependency signature.
 * @param plan - Accepted relative placement plan.
 * @returns Frozen provider continuation.
 */
export function createFloatingObjectContinuation(
  context: QuireLayoutProviderContext,
  dependencySignature: string,
  plan: FloatingObjectPlan
): QuireLayoutProviderContinuation {
  return Object.freeze({
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    dependencySignature,
    state: Object.freeze({ ...plan })
  });
}

/**
 * Reports whether a value is positive and finite.
 *
 * @param value - Candidate number.
 * @returns Whether the value is greater than zero.
 */
function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Reports whether a value is non-negative and finite.
 *
 * @param value - Candidate number.
 * @returns Whether the value is at least zero.
 */
function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
