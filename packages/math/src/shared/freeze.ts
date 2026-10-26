/**
 * Freezes an acyclic admitted data tree before exposing it as an external snapshot.
 * @param value - Bounded formula or presentation data, never a service instance.
 * @returns The same recursively frozen value.
 */
export function freezeMathValue<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeMathValue(child);
    Object.freeze(value);
  }
  return value;
}
