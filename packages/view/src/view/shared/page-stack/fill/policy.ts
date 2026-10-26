import { createQuirePageStackFillBrowserScheduler } from "./browser-scheduler";
import { createQuirePageStackFillPresentationLifecycle } from "./presentation";
import type { MountedPageStackFillOptions, QuirePageStackFillPresentationLifecycle } from "./types";

/**
 * Assembles existing backend fill policies without duplicating scheduler ownership.
 * @param options - Mounted host, optional scheduler, and backend callbacks.
 * @param allowGlobalFrame - Whether the backend historically accepts a global frame fallback.
 * @param browserText - Reads whether browser measurement requires smaller idle chunks.
 * @returns Semantic fill lifecycle with the backend's unchanged window and timing policy.
 */
export function createMountedPageStackFillLifecycle(
  options: MountedPageStackFillOptions,
  allowGlobalFrame: boolean,
  browserText: () => boolean = () => false
): QuirePageStackFillPresentationLifecycle {
  const ownerWindow = options.root.ownerDocument.defaultView;
  const requestFrame = options.runtime?.requestUpdateFrame;
  const cancelFrame = options.runtime?.cancelUpdateFrame;
  const browserRequest = ownerWindow?.requestAnimationFrame?.bind(ownerWindow)
    ?? (allowGlobalFrame ? globalThis.requestAnimationFrame : undefined);
  const browserCancel = ownerWindow?.cancelAnimationFrame?.bind(ownerWindow)
    ?? (allowGlobalFrame ? globalThis.cancelAnimationFrame : undefined);
  const scheduler = options.fill.scheduler ?? createQuirePageStackFillBrowserScheduler({
    requestFrame: requestFrame !== undefined && cancelFrame !== undefined
      ? requestFrame
      : (callback) => {
          if (browserRequest === undefined) {
            throw new RangeError("Page-stack fill requires a browser or runtime frame scheduler");
          }
          return browserRequest(callback);
        },
    cancelFrame: requestFrame !== undefined && cancelFrame !== undefined
      ? cancelFrame
      : (handle) => browserCancel?.(handle),
    preferIdle: browserText,
    idleTimeoutMs: allowGlobalFrame ? 120 : 0
  });

  // Preserve viewport-first bounds: browser text uses 0.75 viewports / four
  // blocks; the other modes use 1.5 viewports / twelve blocks, at 60px per block.
  return createQuirePageStackFillPresentationLifecycle({
    scheduler,
    resumeCooldownMs: 120,
    resolveChunkSize: () => browserText() ? 1 : 8,
    isAvailable: options.isAvailable,
    executePass: options.fill.executePass ?? (() => ({ action: "advance", render: true })),
    onAdvance: options.fill.onAdvance,
    minimumBlockCount: 24,
    resolveInitialBlockLimit: () => Math.max(
      browserText() ? 4 : 12,
      Math.ceil(Math.max(0, options.readVisibleHeight()) * (browserText() ? 0.75 : 1.5) / 60)
    ),
    resolveInitialShapedBlockExtent: options.readVisibleHeight,
    onInitialBridge: options.syncViewport
  });
}
