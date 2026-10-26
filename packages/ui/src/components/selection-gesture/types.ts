import type { QuireKitSelectionHandlePoint } from '../selection-handles/types';

/** Surface gesture configuration, independent of any document selection model. */
export interface QuireKitSelectionGestureProps {
  /** Suspends recognition and cancels an accepted gesture. */
  readonly disabled?: boolean | undefined;
  /** Hold delay in milliseconds. Defaults to 450; must be nonnegative. */
  readonly longPressDelay?: number | undefined;
  /** Allowed jitter in client CSS pixels. Defaults to 8; must be nonnegative. */
  readonly movementThreshold?: number | undefined;
  /** Accepted devices. Defaults to touch and pen; unaccepted devices are left to the host. */
  readonly pointerTypes?: readonly string[] | undefined;
}

/** Surface gesture coordinates in viewport client CSS pixels. */
export interface QuireKitSelectionGestureDetail {
  /** Original pointer identity. */
  readonly pointerId: number;
  /** Device type. */
  readonly pointerType: string;
  /** Initial long-press position; the host resolves its document anchor. */
  readonly origin: QuireKitSelectionHandlePoint;
  /** Latest pointer position for host hit testing. */
  readonly point: QuireKitSelectionHandlePoint;
}

/** Aborted recognition or accepted interaction. */
export interface QuireKitSelectionGestureCancel extends QuireKitSelectionGestureDetail {
  /** Reason for cancellation; no selectionComplete is sent. */
  readonly reason: 'cancel' | 'movement' | 'multitouch' | 'scroll' | 'blur' | 'disabled' | 'destroy' | 'escape';
}

/** Semantic gesture notifications; none opens or owns an operation menu. */
export interface QuireKitSelectionGestureEvents {
  /** Enters the provisional state. @param detail - Accepted hold point. */
  readonly onLongPressStart?: ((detail: QuireKitSelectionGestureDetail) => void) | undefined;
  /** Requests idle long-press actions on release. @param detail - Hold without dragging. */
  readonly onLongPress?: ((detail: QuireKitSelectionGestureDetail) => void) | undefined;
  /** Begins extending a range. @param detail - Stable origin and first moved point. */
  readonly onSelectionStart?: ((detail: QuireKitSelectionGestureDetail) => void) | undefined;
  /** Updates at most once per frame. @param detail - Latest complete pointer sample. */
  readonly onSelectionChange?: ((detail: QuireKitSelectionGestureDetail) => void) | undefined;
  /** Reports successful release after the final update. @param detail - Final pointer sample. */
  readonly onSelectionComplete?: ((detail: QuireKitSelectionGestureDetail) => void) | undefined;
  /** Cancels an accepted hold or drag. @param detail - Last delivered sample and reason. */
  readonly onCancel?: ((detail: QuireKitSelectionGestureCancel) => void) | undefined;
}

/** Binds recognition to one explicit editor surface. */
export interface CreateQuireSelectionGestureOptions extends QuireKitSelectionGestureProps, QuireKitSelectionGestureEvents {
  /** Owning content surface; its children retain ordinary clicks and scrolling. */
  readonly target: HTMLElement;
  /** Adds host exclusions. @param event - Initial pointer event. @returns True to ignore it. */
  readonly ignore?: ((event: PointerEvent) => boolean) | undefined;
}

/** Explicit surface gesture lifecycle. */
export interface QuireSelectionGestureController {
  /** Updates recognition options. @param props - Complete next configuration. */
  update(props: QuireKitSelectionGestureProps): void;
  /** Cancels after document targets or input ownership become invalid. */
  cancel(): void;
  /** Cancels timers, removes all instance listeners and restores the target class. */
  destroy(): void;
}
