/**
 * Creates a shallow object copy without one or more properties.
 *
 * @param object - Source object.
 * @param propOrProps - Property name or names to omit.
 * @returns Object copy without the requested properties.
 */
export function deleteProps<Value>(
  object: Readonly<Record<string, Value>>,
  propOrProps: string | readonly string[]
): Record<string, Value> {
  const props = typeof propOrProps === "string" ? [propOrProps] : propOrProps;
  const next: Record<string, Value> = {};

  for (const [key, value] of Object.entries(object)) {
    if (!props.includes(key)) {
      next[key] = value;
    }
  }

  return next;
}
