import type { QuirePageEndInfo } from "../types";
import type {
  QuirePaginationCheckpoint,
  QuirePaginationCheckpointDelta,
  QuirePaginationItemAnchor
} from "./types";

/**
 * Compares two page-boundary checkpoints and derives their uniform translation.
 *
 * @param previous - Retained checkpoint.
 * @param current - Newly produced checkpoint.
 * @returns Uniform translation, or null when the checkpoints do not converge.
 */
export function compareQuirePaginationCheckpoints(
  previous: QuirePaginationCheckpoint,
  current: QuirePaginationCheckpoint
): QuirePaginationCheckpointDelta | null {
  if (
    previous.pageIndex !== current.pageIndex ||
    previous.isPageTop !== current.isPageTop ||
    previous.geometryKey !== current.geometryKey ||
    !isQuireStringArrayEqual(previous.openMarks, current.openMarks) ||
    !isQuireStringArrayEqual(previous.openNodes, current.openNodes) ||
    !isQuireContinuationStateEqual(previous.continuationState, current.continuationState)
  ) {
    return null;
  }

  return compareQuirePaginationItemAnchors(previous.nextItem, current.nextItem);
}

/**
 * Compares stable item facts while allowing one uniform translation.
 *
 * @param previous - Retained item anchor.
 * @param current - Current item anchor.
 * @returns Uniform translation, or null when item shape or identity changed.
 */
function compareQuirePaginationItemAnchors(
  previous: QuirePaginationItemAnchor,
  current: QuirePaginationItemAnchor
): QuirePaginationCheckpointDelta | null {
  if (
    previous.id !== current.id ||
    previous.height !== current.height ||
    previous.rangeTo - previous.rangeFrom !== current.rangeTo - current.rangeFrom ||
    (previous.flowTop === undefined) !== (current.flowTop === undefined) ||
    (previous.flowBottom === undefined) !== (current.flowBottom === undefined)
  ) {
    return null;
  }

  const range = current.rangeFrom - previous.rangeFrom;
  if (current.rangeTo - previous.rangeTo !== range) {
    return null;
  }
  const flow = current.flowTop === undefined || previous.flowTop === undefined
    ? 0
    : current.flowTop - previous.flowTop;
  if (
    current.flowBottom !== undefined &&
    previous.flowBottom !== undefined &&
    current.flowBottom - previous.flowBottom !== flow
  ) {
    return null;
  }

  return { itemIndex: current.index - previous.index, range, flow };
}

/**
 * Compares continuation payloads structurally without relying on object key order.
 *
 * @param left - Previous continuation state.
 * @param right - Current continuation state.
 * @returns Whether both JSON-like payloads are structurally equal.
 */
function isQuireContinuationStateEqual(
  left: QuirePageEndInfo["continuationState"],
  right: QuirePageEndInfo["continuationState"]
): boolean {
  return isQuireStructuralValueEqual(left, right);
}

/**
 * Compares JSON-like values recursively.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Whether both values are structurally equal.
 */
function isQuireStructuralValueEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isQuireStructuralValueEqual(value, right[index]));
  }
  if (!isQuireRecord(left) || !isQuireRecord(right)) {
    return false;
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return isQuireStringArrayEqual(leftKeys, rightKeys) &&
    leftKeys.every((key) => isQuireStructuralValueEqual(left[key], right[key]));
}

/**
 * Compares two ordered string arrays.
 *
 * @param left - First array.
 * @param right - Second array.
 * @returns Whether both arrays contain the same values.
 */
function isQuireStringArrayEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Checks whether a value is a non-null record.
 *
 * @param value - Value to inspect.
 * @returns Whether the value can be traversed as a record.
 */
function isQuireRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
