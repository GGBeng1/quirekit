/** Default backing-store scale for Canvas surfaces without an explicit host value. */
export const defaultCanvasDevicePixelRatio = 2;

/**
 * Resolves the Canvas backing-store scale from explicit and live runtime inputs.
 *
 * An embedder-provided value remains authoritative. The stable default is 2 so
 * an otherwise unconfigured Canvas surface does not inherit a blurry 1x backing
 * store from test or low-density host assumptions.
 *
 * @param devicePixelRatio - Explicit backing-store scale supplied by the host.
 * @param getDevicePixelRatio - Optional live scale reader supplied by the host.
 * @returns Resolved Canvas backing-store scale.
 */
export function resolveCanvasDevicePixelRatio(
  devicePixelRatio: number | undefined,
  getDevicePixelRatio?: (() => number) | undefined
): number {
  if (devicePixelRatio !== undefined) {
    return devicePixelRatio;
  }

  const runtimeDevicePixelRatio = getDevicePixelRatio?.();

  return runtimeDevicePixelRatio === undefined
    ? defaultCanvasDevicePixelRatio
    : Math.max(defaultCanvasDevicePixelRatio, runtimeDevicePixelRatio);
}
