import type { QuireKitSelectionHandlePoint } from '../types';
import type { SelectionHandleHold, SelectionHandleHoldOptions } from './types';

/** @param value - Configured threshold. @param fallback - Default threshold. @returns A finite nonnegative value. */
function threshold(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Separates immediate caret movement from holding that caret to extend a range.
 * @param options - Timer ports and readiness notification, without a second frame scheduler.
 * @returns Recognition state owned by the existing captured drag.
 */
export function createSelectionHandleHold(options: SelectionHandleHoldOptions): SelectionHandleHold {
  let phase: 'idle' | 'pending' | 'moving' | 'ready' | 'selecting' = 'idle';
  let origin: QuireKitSelectionHandlePoint = { x: 0, y: 0 };
  let timer: number | null = null;
  let tolerance = 8;
  /** Clears delayed recognition before releasing or replacing pointer ownership. */
  function clear(): void {
    if (timer !== null) options.cancelDelay(timer);
    timer = null;
    phase = 'idle';
  }
  return {
    /** @param detail - Stable endpoint and raw grab point. @param settings - Per-press thresholds. */
    begin(detail, settings) {
      clear();
      if (detail.handle !== 'caret') return;
      origin = detail.pointer;
      tolerance = threshold(settings.movementThreshold, 8);
      phase = 'pending';
      timer = options.delay(() => {
        timer = null;
        if (phase !== 'pending') return;
        phase = 'ready';
        options.onReady();
      }, threshold(settings.longPressDelay, 450));
    },
    /** @param point - Raw client point. @returns False while waiting within the allowed jitter. */
    move(point) {
      if (phase !== 'pending' && phase !== 'ready') return true;
      if (Math.hypot(point.x - origin.x, point.y - origin.y) <= tolerance) return false;
      if (timer !== null) options.cancelDelay(timer);
      timer = null;
      phase = phase === 'ready' ? 'selecting' : 'moving';
      return true;
    },
    /** @returns Whether this pointer owns long-press selection. */
    selecting: () => phase === 'ready' || phase === 'selecting',
    /** @returns Whether release should report idle long-press actions. */
    stationary: () => phase === 'ready',
    clear
  };
}
