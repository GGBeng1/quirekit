import type { Messages as SelectionHandlesMessages } from '../../locale/components/selection-handles';

/** Stable handle identity, independent of the ordering of range endpoints. */
export type QuireKitSelectionHandle = 'caret' | 'anchor' | 'focus';

/** A CSS pixel point; the containing contract specifies its coordinate space. */
export interface QuireKitSelectionHandlePoint {
  /** Horizontal coordinate. */
  readonly x: number;
  /** Vertical coordinate. */
  readonly y: number;
}

/** Caret line in the positioned overlay's local CSS pixel coordinate space. */
export interface QuireKitSelectionHandleGeometry extends QuireKitSelectionHandlePoint {
  /** Positive line height; y denotes the top of this line. */
  readonly height: number;
}

/** Explicit caret or directional range. Null geometry hides an offscreen endpoint. */
export type QuireKitSelectionHandlesSelection = {
  /** Displays one bottom handle for an insertion point. */
  readonly type: 'caret';
  /** Insertion point geometry. */
  readonly caret: QuireKitSelectionHandleGeometry | null;
} | {
  /** Displays independently draggable range endpoints. */
  readonly type: 'range';
  /** Stable anchor geometry, not necessarily the earlier document position. */
  readonly anchor: QuireKitSelectionHandleGeometry | null;
  /** Stable focus geometry, not necessarily the later document position. */
  readonly focus: QuireKitSelectionHandleGeometry | null;
  /** Places focus above and anchor below when focus precedes anchor. */
  readonly backward?: boolean;
};

/** Accessible handle names of the active language. */
export type QuireKitSelectionHandlesMessages = SelectionHandlesMessages;

/** Controlled presentation shared by the DOM and Vue entry points. */
export interface QuireKitSelectionHandlesProps {
  /** Current geometry, or null to hide all handles. The host owns selection. */
  readonly selection: QuireKitSelectionHandlesSelection | null;
  /** Disables interaction and cancels the active drag. Defaults to false. */
  readonly disabled?: boolean;
  /** Shows provisional boundary markers and the active bottom grip during long-press selection. */
  readonly selecting?: boolean | undefined;
  /** Caret hold delay before entering selection readiness. Defaults to 450ms. */
  readonly longPressDelay?: number | undefined;
  /** Caret hold jitter tolerance in client CSS pixels. Defaults to 8px. */
  readonly movementThreshold?: number | undefined;
  /** Handle names from the active language pack; defaults to Chinese. The Vue entry supplies them from the Locale Provider. */
  readonly messages?: QuireKitSelectionHandlesMessages | undefined;
}

/** One drag sample in viewport client CSS pixels, suitable for host hit testing. */
export interface QuireKitSelectionHandleDrag {
  /** Identity captured on pointerdown, retained through endpoint crossing. */
  readonly handle: QuireKitSelectionHandle;
  /** Active browser pointer. */
  readonly pointerId: number;
  /** Browser pointer type, usually touch, pen or mouse. */
  readonly pointerType: string;
  /** Hit-test point at the caret line center, adjusted by the initial grab offset. */
  readonly point: QuireKitSelectionHandlePoint;
  /** Unadjusted client pointer position for host autoscroll decisions. */
  readonly pointer: QuireKitSelectionHandlePoint;
}

/** Completion cause; only release commits a final pointer sample. */
export type QuireKitSelectionHandleEndReason = 'release' | 'long-press' | 'cancel' | 'escape' | 'capture-lost'
  | 'blur' | 'disabled' | 'selection-change' | 'destroy';

/** Completion notification; cancellation keeps the last delivered sample. */
export interface QuireKitSelectionHandleDragEnd extends QuireKitSelectionHandleDrag {
  /** Why the gesture ended. Cancellation does not roll back host selection. */
  readonly reason: QuireKitSelectionHandleEndReason;
}

/** Keyboard intent; the host resolves document direction and character boundaries. */
export interface QuireKitSelectionHandleNudge {
  /** Endpoint being adjusted. */
  readonly handle: QuireKitSelectionHandle;
  /** Physical arrow direction; no document position arithmetic is performed. */
  readonly direction: 'left' | 'right' | 'up' | 'down';
  /** Shift requests the host's larger movement unit. */
  readonly accelerated: boolean;
}

/** Framework-neutral creation options. Load the QuireKit UnoCSS preset for styles. */
export interface CreateQuireSelectionHandlesOptions extends QuireKitSelectionHandlesProps {
  /** Document owning the overlay, event listeners and frame scheduler. */
  readonly ownerDocument: Document;
  /** Starts a gesture. @param detail - Captured endpoint and client coordinates. */
  readonly onDragStart?: (detail: QuireKitSelectionHandleDrag) => void;
  /** Enters caret selection readiness. @param detail - Original caret and adjusted client point. */
  readonly onLongPressStart?: (detail: QuireKitSelectionHandleDrag) => void;
  /** Releases a held caret without extending it. @param detail - Original caret sample. */
  readonly onLongPress?: (detail: QuireKitSelectionHandleDrag) => void;
  /** Applies a sample. @param detail - Latest adjusted client point. */
  readonly onDrag?: (detail: QuireKitSelectionHandleDrag) => void;
  /** Ends a gesture. @param detail - Last delivered sample and completion reason. */
  readonly onDragEnd?: (detail: QuireKitSelectionHandleDragEnd) => void;
  /** Reports a successful release after its final sample. @param detail - Completed adjustment. */
  readonly onSelectionComplete?: (detail: QuireKitSelectionHandleDrag) => void;
  /** Adjusts an endpoint by keyboard. @param detail - Host-interpreted movement intent. */
  readonly onNudge?: (detail: QuireKitSelectionHandleNudge) => void;
}

/** Mounted primitive lifecycle. */
export interface QuireSelectionHandlesController {
  /** Absolute overlay root; append inside a positioned host with matching coordinates. */
  readonly element: HTMLElement;
  /** Reprojects the controlled state. @param state - Complete next presentation. */
  update(state: QuireKitSelectionHandlesProps): void;
  /** Cancels pending input without reverting the host's accepted selection. */
  cancel(): void;
  /** Cancels interaction, releases all instance listeners and removes the overlay. */
  destroy(): void;
}
