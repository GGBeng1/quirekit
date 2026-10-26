/**
 * Reports whether a value is a RegExp.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a RegExp.
 */
export function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === "[object RegExp]";
}
