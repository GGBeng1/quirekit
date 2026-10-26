/**
 * Detects macOS when navigator is available.
 *
 * @returns Whether the current platform appears to be macOS.
 */
export function isMacOS(): boolean {
  return typeof navigator !== "undefined" ? /Mac/.test(navigator.platform) : false;
}
