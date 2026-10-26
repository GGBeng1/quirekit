/** Reads the documented nested/array/literal path subset without inherited lookup.
 * @param values - VeeValidate's current values.
 * @param path - Dot/array path, or bracket-wrapped literal key.
 * @returns The dependency value, or undefined if absent.
 */
export function readFormPath(values: Record<string, unknown>, path: string): unknown {
  const keys = /^\[.+\]$/.test(path) ? [path.slice(1, -1)] : path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let value: unknown = values;
  for (const key of keys) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/** Canonicalizes numeric dot segments to VeeValidate's array path identity.
 * @param path - Declared field path.
 * @returns Canonical identity while preserving bracket-wrapped literal names.
 */
export function normalizeFormFieldPath(path: string): string {
  if (/^\[.+\]$/.test(path)) return path;
  return path.split(".").map((part, index) => index === 0 ? part : /^\d+$/.test(part) ? `[${part}]` : `.${part}`).join("");
}
