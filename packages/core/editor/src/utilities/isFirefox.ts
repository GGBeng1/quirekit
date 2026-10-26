/**
 * Detects Firefox when navigator is available.
 *
 * @returns Whether the current browser appears to be Firefox.
 */
export function isFirefox(): boolean {
  return typeof navigator !== "undefined" ? /Firefox/.test(navigator.userAgent) : false;
}
