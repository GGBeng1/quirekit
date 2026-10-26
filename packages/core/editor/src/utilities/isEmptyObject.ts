/**
 * Reports whether a value is an object with no own enumerable keys.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is an empty plain object.
 */
export function isEmptyObject(value: unknown = {}): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0 &&
    value.constructor === Object
  );
}
