/** @param value - Candidate object. @returns Whether it is a plain configuration record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** @param value - Configuration or storage value. @returns Independent plain records and arrays, preserving opaque handles. */
export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => cloneValue(item)) as T;
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T;
  return value;
}

/** @param base - Earlier configuration. @param patch - Overrides; undefined inherits. @returns Merged fresh options. */
export function mergeOptions<T>(base: T, patch: unknown): T {
  if (patch === undefined) return cloneValue(base);
  if (!isRecord(base) || !isRecord(patch)) return cloneValue(patch) as T;
  const result: Record<string, unknown> = cloneValue(base);
  for (const key of Object.keys(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error(`invalid-option-key: ${key}`);
    result[key] = mergeOptions(base[key], patch[key]);
  }
  return result as T;
}
