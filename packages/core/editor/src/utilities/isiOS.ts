/**
 * Detects iOS and iPadOS browsers when navigator/document are available.
 *
 * @returns Whether the current platform appears to be iOS or iPadOS.
 */
export function isiOS(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"]
      .includes(navigator.platform) ||
    (navigator.userAgent.includes("Mac") &&
      typeof document !== "undefined" &&
      "ontouchend" in document)
  );
}
