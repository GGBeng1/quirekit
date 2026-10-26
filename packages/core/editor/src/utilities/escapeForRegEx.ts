/**
 * Escapes special characters in a string so it can be embedded in a RegExp.
 *
 * @param value - String to escape.
 * @returns RegExp-safe string.
 */
export function escapeForRegEx(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
