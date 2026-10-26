/**
 * Finds duplicated items while preserving first duplicate occurrence order.
 *
 * @param items - Items to inspect.
 * @returns Unique duplicated values.
 */
export function findDuplicates<Value>(items: readonly Value[]): Value[] {
  return Array.from(new Set(items.filter((item, index) => items.indexOf(item) !== index)));
}
