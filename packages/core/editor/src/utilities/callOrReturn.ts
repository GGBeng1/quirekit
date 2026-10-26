/**
 * Calls a callback value or returns a static value directly.
 *
 * @param value - Static value or callback.
 * @param context - Optional `this` context for callback values.
 * @param args - Optional callback arguments.
 * @returns The returned or resolved value.
 */
export function callOrReturn<Value, Args extends readonly unknown[] = []>(
  value: Value | ((...args: Args) => Value),
  context?: unknown,
  ...args: Args
): Value {
  return typeof value === "function"
    ? Reflect.apply(value as (...args: unknown[]) => Value, context, [...args])
    : value;
}
