/**
 * Detects Android browsers when navigator is available.
 *
 * @returns Whether the current platform appears to be Android.
 */
export function isAndroid(): boolean {
  return typeof navigator !== "undefined"
    ? navigator.platform === "Android" || /android/i.test(navigator.userAgent)
    : false;
}
