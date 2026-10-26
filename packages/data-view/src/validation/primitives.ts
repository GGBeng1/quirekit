import { DataViewError, requireData } from "./error";

/** Checks exact object keys without accepting class instances.
 * @param value - Untrusted object.
 * @param path - Diagnostic path.
 * @param allowed - Accepted keys.
 * @param required - Mandatory keys, defaulting to all accepted keys.
 * @returns Checked plain object.
 */
export function object(value: unknown, path: string, allowed: readonly string[], required = allowed): Record<string, unknown> {
  requireData(value !== null && typeof value === "object" && !Array.isArray(value), path, "Expected an object");
  requireData(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, path, "Expected plain JSON");
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new DataViewError("unsupported", `${path}.${key}`, "Unknown property");
  for (const key of required) requireData(Object.hasOwn(value, key), `${path}.${key}`, "Missing property");
  return value as Record<string, unknown>;
}

/** Checks an array and its cardinality.
 * @param value - Untrusted array.
 * @param path - Diagnostic path.
 * @param maximum - Maximum item count.
 * @param minimum - Minimum item count.
 * @returns Checked array.
 */
export function array(value: unknown, path: string, maximum = 10000, minimum = 0): unknown[] {
  requireData(Array.isArray(value), path, "Expected an array");
  if (value.length > maximum) throw new DataViewError("budget", path, `Maximum ${maximum} items`);
  requireData(value.length >= minimum, path, `At least ${minimum} items required`);
  return value;
}

/** Checks a string without trimming its semantic content.
 * @param value - Untrusted value.
 * @param path - Diagnostic path.
 * @returns String value.
 */
export function text(value: unknown, path: string): string {
  requireData(typeof value === "string", path, "Expected text"); return value;
}

/** Checks a bounded stable identity.
 * @param value - Untrusted identity.
 * @param path - Diagnostic path.
 * @returns Identity value.
 */
export function identity(value: unknown, path: string): string {
  const result = text(value, path);
  requireData(result.length > 0 && result.length <= 256, path, "Identity must contain 1–256 characters"); return result;
}

/** Checks a known wire discriminator.
 * @param value - Untrusted discriminator.
 * @param choices - Supported values.
 * @param path - Diagnostic path.
 * @returns Supported value.
 */
export function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new DataViewError("unsupported", path, "Unsupported value");
  return value as T;
}

/** Checks a unique sequence of stable identities.
 * @param value - Untrusted sequence.
 * @param path - Diagnostic path.
 * @returns Checked identities.
 */
export function identities(value: unknown, path: string): string[] {
  const ids = array(value, path, 128).map((item, i) => identity(item, `${path}[${i}]`));
  requireData(new Set(ids).size === ids.length, path, "Duplicate identity"); return ids;
}

/** Checks namespaced inert extension metadata.
 * @param value - Optional metadata.
 * @param path - Diagnostic path.
 */
export function extensions(value: unknown, path: string): void {
  if (value === undefined) return;
  requireData(value !== null && typeof value === "object" && !Array.isArray(value), path, "Expected metadata object");
  for (const key of Object.keys(value)) requireData(/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/.test(key), path, "Metadata requires a namespace");
}
