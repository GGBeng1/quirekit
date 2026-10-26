/**
 * Reports whether a value is a plain object with Object.prototype.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a plain object.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    Object.prototype.toString.call(value) === "[object Object]" &&
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
