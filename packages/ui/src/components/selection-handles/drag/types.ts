import type { QuireKitSelectionHandleDrag, QuireKitSelectionHandleDragEnd, QuireKitSelectionHandleEndReason, QuireKitSelectionHandlePoint, QuireKitSelectionHandlesProps } from '../types';

/** Recognition settings captured once when the caret acquires a pointer. */
export type SelectionHandleHoldSettings = Pick<QuireKitSelectionHandlesProps, 'longPressDelay' | 'movementThreshold'>;

/** Timer ports shared by handle movement and its optional caret hold. */
export interface SelectionHandleHoldOptions {
  /** Schedules recognition. @param callback - Hold work. @param ms - Delay. @returns Timer token. */
  delay(callback: () => void, ms: number): number;
  /** Cancels recognition. @param id - Timer token. */
  cancelDelay(id: number): void;
  /** Reports that the caret is ready to extend its selection. */
  onReady(): void;
}

/** A hold classifier with no extra animation frame or document state. */
export interface SelectionHandleHold {
  /** Starts recognition. @param detail - Captured endpoint. @param settings - Hold thresholds. */
  begin(detail: QuireKitSelectionHandleDrag, settings: SelectionHandleHoldSettings): void;
  /** Classifies input. @param point - Raw client point. @returns Whether movement should be delivered. */
  move(point: QuireKitSelectionHandlePoint): boolean;
  /** @returns Whether a held caret owns the range extension. */
  selecting(): boolean;
  /** @returns Whether a recognized hold has not yet moved. */
  stationary(): boolean;
  /** Releases the recognition timer and state. */
  clear(): void;
}

/** Injected scheduling and notifications for a bounded pointer session. */
export interface SelectionHandleDragOptions {
  /** Schedules caret recognition. @param callback - Hold work. @param ms - Delay. @returns Timer token. */
  delay(callback: () => void, ms: number): number;
  /** Cancels caret recognition. @param id - Timer token. */
  cancelDelay(id: number): void;
  /** Schedules one frame. @param callback - Frame work. @returns Cancellation token. */
  schedule(callback: () => void): number;
  /** Cancels scheduled work. @param id - Frame token. */
  cancelFrame(id: number): void;
  /** Reports acquisition. @param detail - Initial client sample. */
  onStart(detail: QuireKitSelectionHandleDrag): void;
  /** Reports caret readiness. @param detail - Initial caret sample. */
  onLongPressStart(detail: QuireKitSelectionHandleDrag): void;
  /** Reports accepted input. @param detail - Latest client sample. */
  onMove(detail: QuireKitSelectionHandleDrag): void;
  /** Reports completion. @param detail - Last sample and reason. */
  onEnd(detail: QuireKitSelectionHandleDragEnd): void;
}

/** One active pointer and at most one outstanding animation frame. */
export interface SelectionHandleDragController {
  /** Acquires a pointer. @param detail - Initial sample. @param settings - Caret recognition thresholds. @returns Whether it remains active. */
  begin(detail: QuireKitSelectionHandleDrag, settings?: SelectionHandleHoldSettings): boolean;
  /** Queues input. @param pointerId - Pointer identity. @param point - Raw client point. */
  move(pointerId: number, point: QuireKitSelectionHandlePoint): void;
  /** Flushes final input. @param pointerId - Pointer identity. @param point - Raw release point. */
  release(pointerId: number, point: QuireKitSelectionHandlePoint): void;
  /** Discards pending input. @param reason - Cancellation cause. */
  cancel(reason: Exclude<QuireKitSelectionHandleEndReason, 'release' | 'long-press'>): void;
  /** @returns Whether the captured caret has entered selection readiness. */
  selecting(): boolean;
  /** @returns The last delivered sample, or null when idle. */
  current(): QuireKitSelectionHandleDrag | null;
}
