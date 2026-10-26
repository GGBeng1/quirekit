/**
 * Formats a value as pretty JSON.
 *
 * @param value - Value to format.
 * @returns JSON string.
 */
export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Escapes text for safe HTML insertion.
 *
 * @param value - Raw text to escape.
 * @returns HTML-escaped text.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Escapes text for safe HTML attribute insertion.
 *
 * @param value - Raw attribute value to escape.
 * @returns HTML-escaped attribute value.
 */
export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

/**
 * Formats a measured duration without implying tiny values are exactly zero.
 *
 * @param durationMs - Duration in milliseconds.
 * @returns Human-readable duration label.
 */
export function formatDuration(durationMs: number): string {
  if (durationMs > 0 && durationMs < 0.01) {
    return "<0.01ms";
  }

  return `${durationMs.toFixed(2)}ms`;
}
