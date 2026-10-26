import type { QuireKitToolbarCollapseUnit } from "./types";

/**
 * Resolves how many leading units stay visible when trailing units collapse into a "more" control.
 *
 * Advances already include gaps, so the row's width is their sum. Once the row overflows, the
 * "more" control's advance is reserved and a separator is never left as the last visible unit.
 *
 * @param units - Units in display order with their measured advances.
 * @param available - Inline size available for the row.
 * @param moreAdvance - Inline size of the "more" control plus the gap before it.
 * @returns Number of leading units that remain visible.
 */
export function resolveQuireKitToolbarVisibleUnits(
  units: readonly QuireKitToolbarCollapseUnit[],
  available: number,
  moreAdvance: number
): number {
  const total = units.reduce((sum, unit) => sum + unit.advance, 0);
  if (total <= available + 0.5) return units.length;
  const budget = available - moreAdvance;
  let used = 0;
  let count = 0;
  for (const unit of units) {
    if (used + unit.advance > budget) break;
    used += unit.advance;
    count += 1;
  }
  while (count > 0 && units[count - 1]!.separator) count -= 1;
  return count;
}
