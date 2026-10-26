import type { QuireKitSelectionGestureDetail } from '../types';
import type { QuireKitSelectionHandlePoint } from '../../selection-handles/types';
import type { SelectionGestureSession, SelectionGestureSessionOptions } from './types';

/** @param value - Configured threshold. @param fallback - Default value. @returns Finite nonnegative threshold. */
function threshold(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Separates native scroll candidates, accepted holds and frame-coalesced selection gestures.
 * @param options - Time ports and semantic callbacks.
 * @returns Explicit recognition lifecycle.
 */
export function createSelectionGestureSession(options: SelectionGestureSessionOptions): SelectionGestureSession {
  let phase: ReturnType<SelectionGestureSession['phase']> = 'idle';
  let current: QuireKitSelectionGestureDetail | null = null;
  let pending: QuireKitSelectionHandlePoint | null = null;
  let timer: number | null = null;
  let frame: number | null = null;
  let tolerance = 8;
  let generation = 0;
  /** Clears all deferred work before handing ownership back to the host. */
  function clear(): void {
    if (timer !== null) options.cancelDelay(timer);
    if (frame !== null) options.cancelFrame(frame);
    timer = frame = null;
    pending = null;
  }
  /** Flushes the most recent pointer while preserving the original long-press anchor. */
  function flush(): void {
    frame = null;
    if (!current || !pending || phase !== 'dragging') return;
    current = { ...current, point: pending };
    pending = null;
    options.onSelectionChange?.(current);
  }
  /** @param reason - Why input was abandoned; pending scroll candidates remain silent. */
  function cancel(reason: Parameters<SelectionGestureSession['cancel']>[0]): void {
    clear();
    const accepted = phase === 'pressed' || phase === 'dragging';
    const previous = current;
    phase = 'idle';
    current = null;
    generation++;
    if (accepted && previous) options.onCancel?.({ ...previous, reason });
  }
  /** @param id - Input owner. @param point - Latest client point. */
  function move(id: number, point: QuireKitSelectionHandlePoint): void {
    if (!current || current.pointerId !== id) return;
    const distance = Math.hypot(point.x - current.origin.x, point.y - current.origin.y);
    if (phase === 'pending') { if (distance > tolerance) cancel('movement'); return; }
    if (phase === 'pressed') {
      if (distance <= tolerance) return;
      phase = 'dragging';
      options.onSelectionStart?.({ ...current, point });
    }
    if (phase !== 'dragging') return;
    pending = point;
    if (frame === null) frame = options.frame(flush);
  }
  return {
    /** @returns Current recognition phase. */
    phase: () => phase,
    /** @returns Last delivered sample. */
    current: () => current,
    /** @param detail - Initial client coordinates. @param props - Current recognition thresholds. */
    begin(detail, props) {
      if (current) { cancel('multitouch'); return; }
      if (props.disabled || !(props.pointerTypes ?? ['touch', 'pen']).includes(detail.pointerType)) return;
      current = detail;
      phase = 'pending';
      tolerance = threshold(props.movementThreshold, 8);
      timer = options.delay(() => {
        timer = null;
        if (phase !== 'pending' || !current) return;
        phase = 'pressed';
        options.onLongPressStart?.(current);
      }, threshold(props.longPressDelay, 450));
    },
    move,
    /** @param id - Input owner. @param point - Actual release position. */
    release(id, point) {
      if (!current || current.pointerId !== id) return;
      const version = generation;
      move(id, point);
      if (!current || generation !== version) return;
      if (phase === 'dragging') {
        if (frame !== null) options.cancelFrame(frame);
        pending = point;
        flush();
      }
      if (!current || generation !== version) return;
      const detail = { ...current, point };
      const completed = phase;
      clear();
      current = null;
      phase = 'idle';
      generation++;
      if (completed === 'pressed') options.onLongPress?.(detail);
      if (completed === 'dragging') options.onSelectionComplete?.(detail);
    },
    cancel
  };
}
