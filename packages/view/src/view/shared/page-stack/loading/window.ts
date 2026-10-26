/**
 * Keeps visible pages and already prepared neighbours, optionally adding one cold neighbour.
 * @param visible - Truly visible indices in document order.
 * @param buffered - Configured bounded window in document order.
 * @param retained - Prepared or requested indices from the preceding window.
 * @param direction - Latest vertical scrolling direction; positive means down.
 * @param prefetch - Whether this idle pass may add one missing neighbour.
 * @returns Ascending indices sharing one clip and surface preparation scope.
 */
export function resolvePagePreparationWindow(
  visible: readonly number[],
  buffered: readonly number[],
  retained: readonly number[],
  direction = 1,
  prefetch = false
): readonly number[] {
  const ready = new Set([...visible, ...retained]);
  const missing = buffered.filter(index => !ready.has(index));
  if (prefetch && visible.length > 0) {
    // The leading edge gets the nearest missing page before warming the trailing edge.
    const ahead = direction > 0
      ? missing.find(index => index > visible[visible.length - 1]!)
      : [...missing].reverse().find(index => index < visible[0]!);
    const next = ahead ?? (direction > 0 ? missing.at(-1) : missing[0]);
    if (next !== undefined) ready.add(next);
  }
  return buffered.filter(index => ready.has(index));
}
