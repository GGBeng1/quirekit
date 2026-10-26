import type {
  QuireMeasuredContainer
} from "../container";
import type { QuirePageFragment } from "../types";
import type { QuirePaginationCheckpointStore } from "../checkpoint";

/** One exact prepared page stream retained beside its checkpoint authority. */
interface QuirePreparedPaginationResultEntry {
  /** Deterministic serialization of every measured pagination input. */
  readonly containerSignature: string;
  /** Measured source range, compared before serializing a candidate. */
  readonly range: QuireMeasuredContainer["range"];
  /** Measured item count, compared before serializing a candidate. */
  readonly itemCount: number;
  /** Geometry and pagination-policy key used by the page driver. */
  readonly geometryKey: string;
  /** Renderer-neutral page stream produced by accepted job work. */
  readonly fragments: readonly QuirePageFragment[];
}

/** Prepared results remain internal to the checkpoint-store lifetime. */
const preparedPaginationResults = new WeakMap<
  QuirePaginationCheckpointStore,
  QuirePreparedPaginationResultEntry
>();

/**
 * Retains one accepted page stream for exact canonical consumption.
 *
 * @param store - Checkpoint authority that scopes the retained result.
 * @param container - Clone-safe measured input used by the job.
 * @param geometryKey - Exact page geometry and policy key.
 * @param fragments - Accepted renderer-neutral page stream.
 */
export function writeQuirePreparedPaginationResult(
  store: QuirePaginationCheckpointStore,
  container: QuireMeasuredContainer,
  geometryKey: string,
  fragments: readonly QuirePageFragment[]
): void {
  preparedPaginationResults.set(store, {
    containerSignature: serializeMeasuredContainer(container),
    range: container.range,
    itemCount: container.items.length,
    geometryKey,
    fragments
  });
}

/**
 * Reads a prepared page stream only for an exactly matching measured input.
 *
 * @param store - Checkpoint authority that scopes the retained result.
 * @param container - Current canonical measured input.
 * @param geometryKey - Current page geometry and policy key.
 * @returns Prepared fragments, or undefined when any pagination fact differs.
 */
export function readQuirePreparedPaginationResult(
  store: QuirePaginationCheckpointStore,
  container: QuireMeasuredContainer,
  geometryKey: string
): readonly QuirePageFragment[] | undefined {
  const entry = preparedPaginationResults.get(store);
  // Serializing the whole container costs O(items); an edit that changed the
  // source range or item count is rejected without it.
  if (
    entry === undefined
    || entry.geometryKey !== geometryKey
    || entry.itemCount !== container.items.length
    || entry.range.from !== container.range.from
    || entry.range.to !== container.range.to
    || entry.containerSignature !== serializeMeasuredContainer(container)
  ) {
    return undefined;
  }
  return entry.fragments;
}

/**
 * Serializes the clone-safe measured contract for collision-free equality.
 *
 * @param container - Measured pagination input.
 * @returns Deterministic JSON signature for canonical measured objects.
 */
function serializeMeasuredContainer(container: QuireMeasuredContainer): string {
  return JSON.stringify(container);
}
