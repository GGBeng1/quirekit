import type { QuireKitSelectionGestureCancel, QuireKitSelectionGestureDetail, QuireKitSelectionGestureEvents, QuireKitSelectionGestureProps } from '../types';
import type { QuireKitSelectionHandlePoint } from '../../selection-handles/types';

/** Browser-independent timer/frame ports for deterministic gesture verification. */
export interface SelectionGestureSessionOptions extends QuireKitSelectionGestureEvents {
  /** Schedules hold recognition. @param callback - Recognition work. @param delay - Milliseconds. @returns Timer token. */
  delay(callback: () => void, delay: number): number;
  /** Cancels a hold timer. @param id - Timer token. */
  cancelDelay(id: number): void;
  /** Schedules selection projection. @param callback - Latest-input work. @returns Frame token. */
  frame(callback: () => void): number;
  /** Cancels a pending projection. @param id - Frame token. */
  cancelFrame(id: number): void;
}

/** Bounded recognition state machine. */
export interface SelectionGestureSession {
  /** @returns Current lifecycle phase. */
  phase(): 'idle' | 'pending' | 'pressed' | 'dragging';
  /** @returns Last accepted sample, if any. */
  current(): QuireKitSelectionGestureDetail | null;
  /** Starts recognition. @param detail - Initial pointer. @param props - Current thresholds. */
  begin(detail: QuireKitSelectionGestureDetail, props: QuireKitSelectionGestureProps): void;
  /** Tracks movement. @param id - Pointer owner. @param point - Raw client point. */
  move(id: number, point: QuireKitSelectionHandlePoint): void;
  /** Ends input. @param id - Pointer owner. @param point - Actual release point. */
  release(id: number, point: QuireKitSelectionHandlePoint): void;
  /** Aborts without completion. @param reason - Cancellation cause. */
  cancel(reason: QuireKitSelectionGestureCancel['reason']): void;
}
