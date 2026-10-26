/**
 * Constrains a host position after external changes without inventing extra steps.
 * @param value - Host or initial zero-based position.
 * @param count - Current number of real items.
 * @returns A finite integer from zero through the completion position.
 */
export function normalizeStep(value: number, count: number): number {
  return Math.min(Math.max(0, count), Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0));
}
