import type { QuireKitSelectionHandleDrag, QuireKitSelectionHandleEndReason, QuireKitSelectionHandlePoint } from '../types';
import type { SelectionHandleDragController, SelectionHandleDragOptions } from './types';
import { createSelectionHandleHold } from './hold';

/**
 * Coalesces raw input without delaying the final release or retaining stale work.
 * @param options - Host scheduler and notifications.
 * @returns One explicitly cancellable pointer session.
 */
export function createSelectionHandleDrag(options: SelectionHandleDragOptions): SelectionHandleDragController {
  let active: QuireKitSelectionHandleDrag | null = null;
  let offset = { x: 0, y: 0 };
  let pending: QuireKitSelectionHandlePoint | null = null;
  let frame: number | null = null;
  let generation = 0;
  const hold = createSelectionHandleHold({
    delay: options.delay, cancelDelay: options.cancelDelay,
    onReady: () => { if (active) options.onLongPressStart(active); }
  });

  /** Drops stale samples before cancellation or a synchronous final flush. */
  function clear(): void {
    if (frame !== null) options.cancelFrame(frame);
    frame = null;
    pending = null;
  }
  /** @param point - Latest raw client point, never a local overlay coordinate. */
  function deliver(point: QuireKitSelectionHandlePoint): void {
    if (!active) return;
    active = { ...active, pointer: point, point: { x: point.x - offset.x, y: point.y - offset.y } };
    options.onMove(active);
  }
  /** Consumes only the most recent complete sample for this presentation frame. */
  function flush(): void {
    frame = null;
    const point = pending;
    pending = null;
    if (point) deliver(point);
  }
  /** @param reason - Completion cause, with state detached before notifying consumers. */
  function finish(reason: QuireKitSelectionHandleEndReason): void {
    clear();
    const previous = active;
    active = null;
    hold.clear();
    generation++;
    if (previous) options.onEnd({ ...previous, reason });
  }
  return {
    /** @param detail - Initial client sample. @param settings - Caret hold thresholds. @returns Whether acquisition survived callbacks. */
    begin(detail, settings = {}) {
      if (active) return false;
      active = detail;
      offset = { x: detail.pointer.x - detail.point.x, y: detail.pointer.y - detail.point.y };
      hold.begin(detail, settings);
      options.onStart(detail);
      return active !== null;
    },
    /** @param pointerId - Input owner. @param point - Raw client sample. */
    move(pointerId, point) {
      if (active?.pointerId !== pointerId) return;
      if (!hold.move(point)) return;
      pending = point;
      if (frame === null) frame = options.schedule(flush);
    },
    /** @param pointerId - Input owner. @param point - Actual pointerup client sample. */
    release(pointerId, point) {
      if (active?.pointerId !== pointerId) return;
      hold.move(point);
      if (hold.stationary()) { finish('long-press'); return; }
      const version = generation;
      clear();
      deliver(point);
      // A consumer may cancel or replace the session while accepting this final input.
      if (active && generation === version) finish('release');
    },
    /** @param reason - Cancellation cause. */
    cancel: finish,
    /** @returns Whether the caret has entered long-press selection. */
    selecting: hold.selecting,
    /** @returns Current delivered input, without exposing pending raw events. */
    current: () => active
  };
}
