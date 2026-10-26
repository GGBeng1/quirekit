/**
 * Reports whether declared provider subsets intersect a requested script filter.
 *
 * @param availableSubsets - Provider-declared subset tokens for one family.
 * @param requestedSubsets - Accepted subset tokens for the active Hub filter.
 * @returns Whether the family belongs in the filtered catalog.
 */
export function matchesClassicWebFontSubsets(
  availableSubsets: readonly string[] | undefined,
  requestedSubsets: readonly string[] | undefined
): boolean {
  if (requestedSubsets === undefined || requestedSubsets.length === 0) return true;
  if (availableSubsets === undefined || availableSubsets.length === 0) return false;
  const available = new Set(availableSubsets.map(normalizeSubset));
  return requestedSubsets.some((subset) => available.has(normalizeSubset(subset)));
}

/**
 * Normalizes one provider subset token for source-neutral comparison.
 *
 * @param subset - Provider or product subset token.
 * @returns Trimmed lowercase token with underscore separators normalized.
 */
function normalizeSubset(subset: string): string {
  return subset.trim().toLocaleLowerCase("en-US").replaceAll("_", "-");
}
