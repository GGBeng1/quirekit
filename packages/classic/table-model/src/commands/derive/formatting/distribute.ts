/**
 * Distributes a numeric total over a fixed number of slots.
 *
 * Integer totals keep integer outputs by placing the remainder into the first
 * slots. Decimal totals use an even floating-point value.
 *
 * @param total - Numeric total to distribute.
 * @param count - Number of slots to fill.
 * @returns Distributed values, or null when the input cannot be distributed.
 */
export function distributeNumericTotal(
  total: number,
  count: number
): readonly number[] | null {
  if (!Number.isFinite(total) || total < 0 || !Number.isInteger(count) || count <= 0) {
    return null;
  }

  if (!Number.isInteger(total)) {
    return Array.from({ length: count }, () => total / count);
  }

  const base = Math.floor(total / count);
  const remainder = total % count;

  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base
  );
}
