/**
 * Checks whether a value is a string.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}
