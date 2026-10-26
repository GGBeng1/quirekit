import type { QuireTextFragment } from "./types";

/** Cached flow-order metadata for one text-fragment array. */
export interface QuireTextFragmentFlowOrderMetadata {
  /** Whether fragment `rect.y` values are known to be non-decreasing. */
  readonly sortedByLineTop: boolean;
}

/** Last-known flow-order metadata keyed by fragment array identity. */
const textFragmentFlowOrderStore =
  new WeakMap<readonly QuireTextFragment[], QuireTextFragmentFlowOrderMetadata>();

/**
 * Marks a fragment array as sorted by line top.
 *
 * @param fragments - Fragment array whose flow order is known by construction.
 * @returns The same fragment array for inline use at creation sites.
 */
export function markQuireTextFragmentsSortedByLineTop<
  Fragments extends readonly QuireTextFragment[]
>(fragments: Fragments): Fragments {
  cacheQuireTextFragmentFlowOrderMetadata(fragments, { sortedByLineTop: true });
  return fragments;
}

/**
 * Reads cached flow-order metadata for a fragment array.
 *
 * @param fragments - Fragment array to inspect.
 * @returns Cached metadata, or undefined when the order is unknown.
 */
export function readQuireTextFragmentFlowOrderMetadata(
  fragments: readonly QuireTextFragment[]
): QuireTextFragmentFlowOrderMetadata | undefined {
  return textFragmentFlowOrderStore.get(fragments);
}

/**
 * Stores flow-order metadata for a fragment array.
 *
 * @param fragments - Fragment array that owns the metadata.
 * @param metadata - Flow-order metadata to cache.
 * @returns Nothing.
 */
export function cacheQuireTextFragmentFlowOrderMetadata(
  fragments: readonly QuireTextFragment[],
  metadata: QuireTextFragmentFlowOrderMetadata
): void {
  textFragmentFlowOrderStore.set(fragments, metadata);
}
