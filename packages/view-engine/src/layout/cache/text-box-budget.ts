/** Text-box entries retained regardless of document size. */
export const minimumQuireMeasuredTextBoxEntries = 4096;

/**
 * Sizes the retained text-box entries from the latest body build.
 *
 * Shifted reuse needs an entry for every paragraph after an edit, and a body
 * has at least one measured item per text box, so the item count bounds it.
 *
 * @param itemCount - Measured items of the latest body container.
 * @returns Entries to retain.
 */
export function resolveQuireMeasuredTextBoxBudget(itemCount: number): number {
  return Math.max(minimumQuireMeasuredTextBoxEntries, Math.ceil(itemCount * 1.25));
}

/**
 * Drops the oldest entries of an insertion-ordered store until it fits a budget.
 *
 * @param store - Insertion-ordered store.
 * @param budget - Maximum retained entries.
 */
export function trimQuireMeasuredTextBoxStore(store: Map<string, unknown>, budget: number): void {
  for (const key of store.keys()) {
    if (store.size <= budget) return;
    store.delete(key);
  }
}
