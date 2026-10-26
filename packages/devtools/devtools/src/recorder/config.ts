/** Default maximum number of devtools entries kept in memory. */
export const defaultMaxEntries = 500;

/**
 * Default slow thresholds per entry type, in milliseconds (RAIL-aligned). A single
 * value is wrong because operations differ: a transaction should be near-instant, a
 * render can legitimately exceed one frame (first paint / structural rebuilds), and
 * an input→render trace is judged by the "feels instant" response budget.
 */
export const defaultSlowThresholds = {
  /** Input→render latency: RAIL "response feels instant" budget. */
  interaction: 100,
  /** A single render pass: structural renders legitimately exceed one frame. */
  render: 50,
  /** A transaction apply: should be near-instant. */
  operation: 16
} as const;

/**
 * Reads the default monotonic clock.
 *
 * @returns Current timestamp in milliseconds.
 */
export function readDefaultClock(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/**
 * Normalizes the configured entry limit.
 *
 * @param maxEntries - Requested maximum entry count.
 * @returns Non-negative integer entry limit.
 */
export function normalizeEntryLimit(maxEntries: number | undefined): number {
  return Math.max(0, Math.floor(maxEntries ?? defaultMaxEntries));
}
