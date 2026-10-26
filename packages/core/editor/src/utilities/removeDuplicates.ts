/**
 * Removes duplicate values while preserving first occurrence order.
 *
 * @param values - Values to de-duplicate.
 * @returns Values without duplicates.
 */
export function removeDuplicates<Value>(values: readonly Value[]): Value[] {
  return Array.from(new Set(values));
}
