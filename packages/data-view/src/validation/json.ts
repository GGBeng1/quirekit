import { DataViewError, requireData } from "./error";

/** Maximum encoded size of an editable local embed. */
export const DATA_VIEW_MAX_BYTES = 4 * 1024 * 1024;

/** Checks encoded UTF-8 size without depending on browser encoders.
 * @param source - JSON text.
 */
export function checkJsonSize(source: string): void {
  let bytes = 0;
  for (const character of source) {
    const point = character.codePointAt(0)!;
    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
    if (bytes > DATA_VIEW_MAX_BYTES) throw new DataViewError("budget", "$", "Inline data exceeds 4 MiB; use an external source");
  }
}

/** Verifies a JSON tree before serialization can invoke custom accessors.
 * @param value - Untrusted value.
 * @param path - Diagnostic location.
 * @param ancestors - Current recursion ancestors.
 * @param depth - Current nesting depth.
 */
function checkTree(value: unknown, path: string, ancestors: Set<object>, depth: number): void {
  if (depth > 64) throw new DataViewError("budget", path, "JSON nesting exceeds 64");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") { requireData(Number.isFinite(value), path, "Expected a finite number"); return; }
  requireData(typeof value === "object", path, "Expected JSON data");
  requireData(!ancestors.has(value), path, "Cyclic JSON");
  requireData(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, path, "Expected plain JSON");
  requireData(Object.getOwnPropertySymbols(value).length === 0, path, "Symbol properties are not JSON");
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (Array.isArray(value) && key === "length") continue;
    requireData("value" in descriptor && descriptor.enumerable, `${path}.${key}`, "Accessors and hidden properties are not JSON");
    checkTree(descriptor.value, `${path}.${key}`, ancestors, depth + 1);
  }
  if (Array.isArray(value)) requireData(Object.keys(value).length === value.length && Object.keys(value).every((key, index) => key === String(index)), path, "Sparse or decorated arrays are not JSON");
  ancestors.delete(value);
}

/** Clones validated JSON with a fixed storage budget.
 * @param value - Untrusted input.
 * @returns Detached JSON value.
 */
export function copyJson<T>(value: T): T {
  checkTree(value, "$", new Set(), 0);
  const source = JSON.stringify(value); checkJsonSize(source);
  return JSON.parse(source) as T;
}
