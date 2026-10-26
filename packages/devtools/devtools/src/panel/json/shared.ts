/**
 * Reads enumerable JSON entries.
 *
 * @param value - JSON object or array.
 * @returns Entry pairs.
 */
export function getJsonEntries(value: unknown): readonly [string, unknown][] {
  if (Array.isArray(value)) {
    return value.map((child, index) => [String(index), child]);
  }

  return isPlainObject(value) ? Object.entries(value) : [];
}

/**
 * Reads a ProseMirror-like node type from a JSON object.
 *
 * @param value - JSON value to inspect.
 * @returns Node type label when the object has a string `type` property.
 */
export function getJsonNodeType(value: unknown): string | undefined {
  if (!isPlainObject(value) || typeof value.type !== "string") {
    return undefined;
  }

  return value.type;
}

/**
 * Formats searchable text for one JSON tree row.
 *
 * @param label - Row label.
 * @param value - Row value.
 * @param path - Row path.
 * @returns Searchable row text.
 */
export function formatJsonSearchText(
  label: string,
  value: unknown,
  path: string
): string {
  return [
    label,
    path,
    getJsonNodeType(value) ?? "",
    isContainer(value) ? formatContainerPreview(value) : formatPrimitive(value)
  ].filter(Boolean).join(" ");
}

/**
 * Checks whether a value is an expandable JSON container.
 *
 * @param value - Value to test.
 * @returns True for arrays and plain objects.
 */
export function isContainer(value: unknown): boolean {
  return Array.isArray(value) || isPlainObject(value);
}

/**
 * Formats a primitive JSON value.
 *
 * @param value - Primitive value.
 * @returns Display string.
 */
export function formatPrimitive(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

/**
 * Returns the primitive type class suffix.
 *
 * @param value - Primitive value.
 * @returns Primitive type name.
 */
export function getPrimitiveType(value: unknown): string {
  return value === null ? "null" : typeof value;
}

/**
 * Formats an array or object summary.
 *
 * @param value - Container value.
 * @returns Compact container preview.
 */
export function formatContainerPreview(value: unknown): string {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  return `Object(${getJsonEntries(value).length})`;
}

/**
 * Checks whether a value is a plain object.
 *
 * @param value - Value to test.
 * @returns True for non-null objects that are not arrays.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
