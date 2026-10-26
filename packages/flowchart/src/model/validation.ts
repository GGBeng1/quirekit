/** @param value - Untrusted object. @param keys - Admitted fields. @param path - Error location. @returns Checked record without accessors. */
export function record(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${path}: expected plain object`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !keys.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value")) {
      throw new TypeError(`${path}: unsupported field ${String(key)}`);
    }
  }
  return value as Record<string, unknown>;
}
/** @param value - Candidate number. @param min - Inclusive lower bound. @param max - Inclusive upper bound. @param path - Location. @returns Finite bounded number. */
export function number(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new TypeError(`${path}: invalid number`);
  return value;
}
/** @param value - Candidate literal. @param values - Allowed values. @param path - Location. @returns Checked literal. */
export function choice<T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (!values.includes(value as T)) throw new TypeError(`${path}: unsupported value`);
  return value as T;
}
/** @param value - Candidate Unicode string. @returns XML-safe literal text. */
export function text(value: unknown): string {
  if (typeof value !== "string" || value.length > 10000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u.test(value)) {
    throw new TypeError("text: invalid Unicode or length");
  }
  return value;
}
/** @param value - Candidate ID. @returns Graph-local ID. */
export function identity(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value)) throw new TypeError("id: invalid identity");
  return value;
}
/** @param value - Candidate array. @param max - Allowed count. @returns Dense bounded array. */
export function array(value: unknown, max: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new TypeError("array: expected bounded list");
  // Indexed descriptors avoid invoking getters in object-form public inputs.
  for (let i = 0; i < value.length; i++) if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, i) ?? {}, "value")) throw new TypeError("array: expected plain values");
  return value;
}
