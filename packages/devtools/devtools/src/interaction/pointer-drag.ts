import type { QuireDevtoolsInteractionInput, QuireDevtoolsMount } from "../types";
import { describeEventTarget, isIgnoredInteraction } from "./event-target";

/**
 * Observes frame-bounded moves belonging to a primary-button editor drag.
 *
 * @param element - Host in which an eligible pointer drag must start.
 * @param record - Records the earliest browser input before mounted view work.
 * @returns Cleanup for the session, continuation listeners, and sampling frame.
 */
export function observeQuireDevtoolsPointerDrag(
  element: HTMLElement,
  record: (input: QuireDevtoolsInteractionInput) => void
): QuireDevtoolsMount {
  const ownerWindow = element.ownerDocument.defaultView;
  const continuationTarget = ownerWindow ?? element.ownerDocument;
  const listenerOptions = { capture: true } as const;
  let pointerId: number | undefined;
  let cancelSamplingFrame: (() => void) | undefined;

  /** Releases the captured pointer and any pending sampling reset. */
  const clearSession = (): void => {
    pointerId = undefined;
    cancelSamplingFrame?.();
    cancelSamplingFrame = undefined;
    continuationTarget.removeEventListener("pointermove", onMove, listenerOptions);
    continuationTarget.removeEventListener("pointerup", onEnd, listenerOptions);
    continuationTarget.removeEventListener("pointercancel", onEnd, listenerOptions);
    ownerWindow?.removeEventListener("blur", onBlur, listenerOptions);
  };

  /**
   * Records only the first eligible move before the next animation frame.
   *
   * @param event - Pointer continuation event from the owner window.
   */
  const onMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId !== pointerId) return;
    if ((pointer.buttons & 1) === 0) {
      clearSession();
      return;
    }
    if (isIgnoredInteraction(event.target) || cancelSamplingFrame !== undefined) return;

    // Start immediately in capture phase, ahead of the editor's drag frame.
    // Later points in this frame must not move the latency origin forward or
    // create another pending trace for the same eventual selection paint.
    cancelSamplingFrame = afterPointerSamplingFrame(ownerWindow, () => {
      cancelSamplingFrame = undefined;
    });
    record({
      source: "pointermove",
      label: "drag selection",
      target: describeEventTarget(event.target)
    });
  };

  /**
   * Releases the matching session without discarding its in-flight trace.
   *
   * @param event - Pointer release or cancellation event.
   */
  const onEnd = (event: Event): void => {
    if ((event as PointerEvent).pointerId === pointerId) clearSession();
  };

  /**
   * Ends ownership when the browser can no longer guarantee pointer release delivery.
   *
   * @param event - Window or descendant focus-loss event.
   */
  const onBlur = (event: Event): void => {
    if (event.target === event.currentTarget) clearSession();
  };

  /**
   * Captures one editor-owned primary-button drag before observing continuations.
   *
   * @param event - Pointer press inside the observed host.
   */
  const onDown = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointerId !== undefined && pointerId !== pointer.pointerId) return;
    clearSession();
    if (
      pointer.button !== 0
      || (pointer.buttons & 1) === 0
      || isIgnoredInteraction(event.target)
    ) return;

    pointerId = pointer.pointerId;
    continuationTarget.addEventListener("pointermove", onMove, listenerOptions);
    continuationTarget.addEventListener("pointerup", onEnd, listenerOptions);
    continuationTarget.addEventListener("pointercancel", onEnd, listenerOptions);
    ownerWindow?.addEventListener("blur", onBlur, listenerOptions);
  };

  element.addEventListener("pointerdown", onDown, listenerOptions);

  return {
    destroy: () => {
      element.removeEventListener("pointerdown", onDown, listenerOptions);
      clearSession();
    }
  };
}

/**
 * Schedules one cancellable sampling reset using the observed window's frame clock.
 *
 * @param ownerWindow - Window owning the host, when a browser frame is available.
 * @param callback - Reset to run at the next frame boundary.
 * @returns Function canceling the pending reset.
 */
function afterPointerSamplingFrame(
  ownerWindow: Window | null,
  callback: () => void
): () => void {
  if (typeof ownerWindow?.requestAnimationFrame === "function") {
    const frame = ownerWindow.requestAnimationFrame(callback);
    return () => ownerWindow.cancelAnimationFrame(frame);
  }

  const timeout = setTimeout(callback, 16);
  return () => clearTimeout(timeout);
}
