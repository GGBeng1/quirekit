import type { CreateMountedPaginatedTransientPresentationOptions } from "./types";

/**
 * Resolves injected or browser-native frame scheduling as one cancelable pair.
 *
 * @param options - Mounted presentation options carrying host hooks.
 * @returns Frame request and cancellation functions.
 */
export function resolveDrawingPreviewFrameScheduler(
  options: CreateMountedPaginatedTransientPresentationOptions
): Readonly<{
  request: (callback: () => void) => number;
  cancel: (handle: number) => void;
}> {
  if (
    options.requestDrawingPreviewFrame !== undefined
    && options.cancelDrawingPreviewFrame !== undefined
  ) {
    return {
      request: options.requestDrawingPreviewFrame,
      cancel: options.cancelDrawingPreviewFrame
    };
  }

  const ownerWindow = options.ownerDocument.defaultView;
  if (
    ownerWindow !== null
    && ownerWindow !== undefined
    && typeof ownerWindow.requestAnimationFrame === "function"
    && typeof ownerWindow.cancelAnimationFrame === "function"
  ) {
    return {
      request: (callback) => ownerWindow.requestAnimationFrame(() => callback()),
      cancel: (handle) => ownerWindow.cancelAnimationFrame(handle)
    };
  }

  return {
    request: (callback) => globalThis.setTimeout(callback, 0) as unknown as number,
    cancel: (handle) => globalThis.clearTimeout(handle)
  };
}
