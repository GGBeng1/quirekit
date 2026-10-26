const maxPreviewLength = 96;

/**
 * Reads a compact value type.
 *
 * @param value - Value to inspect.
 * @returns Type label.
 */
export function getValueType(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value === "object"
    ? (value as { readonly constructor?: { readonly name?: string } }).constructor?.name ??
        "object"
    : typeof value;
}

/**
 * Creates a compact value preview.
 *
 * @param value - Value to preview.
 * @returns Preview text.
 */
export function previewValue(value: unknown): string {
  if (typeof value === "string") {
    return truncate(JSON.stringify(value));
  }
  if (value === undefined || value === null || typeof value !== "object") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  return getValueType(value);
}

/**
 * Truncates a preview string.
 *
 * @param value - Value to truncate.
 * @returns Truncated value.
 */
export function truncate(value: string): string {
  return value.length > maxPreviewLength
    ? `${value.slice(0, maxPreviewLength - 1)}...`
    : value;
}

/**
 * Checks whether a value is a plain object.
 *
 * @param value - Value to test.
 * @returns True when the value is a plain object.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
