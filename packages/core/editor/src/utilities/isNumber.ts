/**
 * Checks whether a value is a number.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a finite number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
