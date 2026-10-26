/**
 * Reads a plain data object and rejects unknown fields and accessors.
 * @param input - Untrusted object.
 * @param keys - Admitted own string keys.
 * @param path - Diagnostic location.
 * @returns Checked plain record without silently removing fields.
 */
export function readRecord(input: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError(`${path}: expected a plain object`);
  }
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !keys.includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key)!, "value")) {
      throw new TypeError(`${path}: unsupported field ${String(key)}`);
    }
  }
  return input as Record<string, unknown>;
}

/**
 * Checks text suitable for both JSON storage and XML snapshots.
 * @param input - Untrusted text.
 * @param path - Diagnostic location.
 * @returns Original, unnormalized literal text.
 */
export function readText(input: unknown, path: string): string {
  if (typeof input !== "string" || input.length > 10000
    || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u.test(input)) {
    throw new TypeError(`${path}: invalid text or text limit exceeded`);
  }
  return input;
}
