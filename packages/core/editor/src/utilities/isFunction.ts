/**
 * Checks whether a value is a function.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a function.
 */
export function isFunction(value: unknown): value is (...args: readonly unknown[]) => unknown {
  return typeof value === "function";
}
