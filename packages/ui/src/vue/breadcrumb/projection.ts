import type { BreadcrumbProjection } from './types';
/**
 * Preserves the root and nearest ancestors without changing original item identities.
 * @param length - Number of supplied path entries.
 * @param maxItems - Explicit display budget, including the overflow entry.
 * @returns Visible indices and the original ordered middle indices.
 */
export function projectBreadcrumb(length: number, maxItems?: number): BreadcrumbProjection {
  const indices = Array.from({ length }, (_, index) => index);
  if (maxItems === undefined || !Number.isFinite(maxItems)) return { visible: indices, hidden: [] };
  const limit = Math.max(3, Math.floor(maxItems));
  if (length <= limit) return { visible: indices, hidden: [] };
  const tail = length - (limit - 2);
  return { visible: [0, null, ...indices.slice(tail)], hidden: indices.slice(1, tail) };
}
