import type { ClassicEditorCommandStripMeasurement } from "./types";

/**
 * Merges currently mounted intrinsic measurements into a retained width cache.
 *
 * Items moved into overflow are intentionally absent from `measurements`; their
 * last intrinsic widths remain authoritative until source or locale invalidation.
 *
 * @param cache - Last intrinsic width cache.
 * @param measurements - Currently mounted element measurements.
 * @returns Immutable merged width cache.
 */
export function mergeClassicEditorIntrinsicWidths(
  cache: Readonly<Record<string, number>>,
  measurements: readonly ClassicEditorCommandStripMeasurement[]
): Readonly<Record<string, number>> {
  const merged = {
    ...cache,
    ...Object.fromEntries(measurements.map(({ id, width }) => [id, width]))
  };
  return equalWidthCaches(cache, merged) ? cache : Object.freeze(merged);
}

/**
 * Removes cached widths whose source contribution is no longer applicable.
 *
 * @param cache - Last intrinsic width cache.
 * @param sourceIds - Current group or task ids.
 * @returns Immutable cache containing current source ids only.
 */
export function retainClassicEditorSourceWidths(
  cache: Readonly<Record<string, number>>,
  sourceIds: readonly string[]
): Readonly<Record<string, number>> {
  const retained = new Set(sourceIds);
  const next = Object.fromEntries(
    Object.entries(cache).filter(([id]) => retained.has(id))
  );
  return equalWidthCaches(cache, next) ? cache : Object.freeze(next);
}

/**
 * Compares two finite intrinsic-width caches without creating a render revision.
 *
 * @param left - Previous retained widths.
 * @param right - Candidate measured widths.
 * @returns Whether both caches contain identical ids and CSS-pixel values.
 */
function equalWidthCaches(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>
): boolean {
  const entries = Object.entries(left);
  return entries.length === Object.keys(right).length
    && entries.every(([id, width]) => right[id] === width);
}
