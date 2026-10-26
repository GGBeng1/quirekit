/**
 * Copies bounded registration metadata without interpreting renderer contracts.
 *
 * Data fields include provider region capabilities and adapter crossing modes.
 * Unknown accessors, class instances, cycles or unbounded payloads cannot prove
 * reusable metadata. Function identities are values; callbacks are never run.
 *
 * @param tokens - Owned current comparison vector.
 * @param value - Public registration metadata or opaque payload to inspect.
 * @returns Whether all metadata was copied within the conservative bound.
 */
export function appendLayoutMetadata(tokens: unknown[], value: unknown): boolean {
  const ancestors = new Set<object>();
  let remaining = 512;

  /**
   * Copies one data subtree while preserving shape and property order.
   *
   * @param current - Current metadata value.
   * @param depth - Current bounded nesting depth.
   * @returns Whether the subtree has complete evidence.
   */
  function append(current: unknown, depth: number): boolean {
    if (--remaining < 0 || depth > 8) return false;
    if (current === null || typeof current !== "object") {
      tokens.push(current);
      return true;
    }
    if (ancestors.has(current)) return false;
    const prototype = Object.getPrototypeOf(current) as object | null;
    if (!Array.isArray(current) && prototype !== null && prototype !== Object.prototype) return false;
    ancestors.add(current);
    const keys = Object.getOwnPropertyNames(current);
    tokens.push(current, Array.isArray(current) ? "array" : "record", keys.length);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) return false;
      tokens.push(key);
      if (!append(descriptor.value, depth + 1)) return false;
    }
    ancestors.delete(current);
    return true;
  }

  return append(value, 0);
}
