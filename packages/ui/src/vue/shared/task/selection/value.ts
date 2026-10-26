import type { TaskSelectionItem } from "./types";

/** @param values - Incoming model. @returns Independent ordered unique values. */
export function copySelection(values: readonly string[]): string[] { return [...new Set(values)]; }

/** @param left - Current value. @param right - Candidate value. @returns Ordered semantic equality. */
export function equalSelection(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Preserves baseline values while refusing newly added missing or disabled candidates.
 * @param value - Proposed complete selection.
 * @param baseline - Existing committed selection.
 * @param items - Current authoritative candidate collection.
 * @returns Whether the candidate is eligible for submission.
 */
export function isSelectionAvailable(value: readonly string[], baseline: readonly string[], items: readonly TaskSelectionItem[]): boolean {
  return value.every(entry => baseline.includes(entry) || items.some(item => item.value === entry && !item.disabled));
}
