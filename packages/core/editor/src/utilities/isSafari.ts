/**
 * Detects desktop Safari when navigator is available.
 *
 * @returns Whether the current browser appears to be Safari.
 */
export function isSafari(): boolean {
  return typeof navigator !== "undefined"
    ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    : false;
}
