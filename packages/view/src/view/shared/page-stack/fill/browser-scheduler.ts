import type {
  QuirePageStackFillBrowserSchedulerOptions,
  QuirePageStackFillCancel,
  QuirePageStackFillScheduler
} from "./types";

/**
 * Guards a scheduled callback and its cancellation with the same once-only lifetime.
 * @param request - Schedules the guarded callback on a frame, idle turn or timer.
 * @param cancel - Releases the backend handle while the callback is still pending.
 * @param callback - Work admitted exactly once unless cancelled first.
 * @returns Idempotent cancellation for this scheduled callback.
 */
function schedule<Handle>(
  request: (callback: () => void) => Handle,
  cancel: (handle: Handle) => void,
  callback: () => void
): QuirePageStackFillCancel {
  let active = true;
  const handle = request(() => {
    if (!active) return;
    active = false;
    callback();
  });
  return () => {
    if (!active) return;
    active = false;
    cancel(handle);
  };
}

/**
 * Creates the browser scheduler used by mounted page-stack fill controllers.
 *
 * The paint bridge always uses a frame. Backend policy may place later passes
 * into idle periods, while focused interaction cooldown always uses a timer.
 *
 * @param options - Browser frame capabilities and backend idle policy.
 * @returns Shared bridge, pass, and cooldown scheduling strategy.
 */
export function createQuirePageStackFillBrowserScheduler(
  options: QuirePageStackFillBrowserSchedulerOptions
): QuirePageStackFillScheduler {
  /**
   * Uses the backend's frame capability for a paint bridge or a non-idle pass.
   * @param callback - Callback scheduled for the next frame.
   * @returns Idempotent frame cancellation.
   */
  const frame = (callback: () => void): QuirePageStackFillCancel => schedule(
    next => options.requestFrame(next), handle => options.cancelFrame(handle), callback
  );
  return {
    scheduleBridge: frame,
    schedulePass: callback => options.preferIdle() && typeof globalThis.requestIdleCallback === "function"
      ? schedule(next => globalThis.requestIdleCallback(next, { timeout: options.idleTimeoutMs }),
          handle => globalThis.cancelIdleCallback?.(handle), callback)
      : frame(callback),
    scheduleDelay: (callback, delayMs) => schedule(next => setTimeout(next, delayMs), clearTimeout, callback)
  };
}
