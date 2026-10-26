/** Options used to bind document-level mounted pointer drag events. */
export interface BindMountedPointerDragDocumentEventsOptions {
  /** Document that owns the mounted editor surface. */
  readonly ownerDocument: Document;
  /** Handles pointer movement while a drag selection is active. */
  readonly handlePointerMove: (event: PointerEvent) => void;
  /** Handles pointer completion or cancellation while a drag selection is active. */
  readonly handlePointerEnd: (event: PointerEvent) => void;
}

const mountedPointerDragDocumentListenerOptions: AddEventListenerOptions = {
  capture: true
};

/**
 * Binds document-level pointer events for an active mounted view drag session.
 *
 * @param options - Owner document and pointer drag handlers to bind.
 * @returns Cleanup function for the transient document listeners.
 */
export function bindMountedPointerDragDocumentEvents(
  options: BindMountedPointerDragDocumentEventsOptions
): () => void {
  const handlePointerMove = options.handlePointerMove as EventListener;
  const handlePointerEnd = options.handlePointerEnd as EventListener;
  const cleanupDocument = bindMountedPointerDragEventsToTarget(
    options.ownerDocument,
    handlePointerMove,
    handlePointerEnd
  );
  const cleanupWindow = options.ownerDocument.defaultView
    ? bindMountedPointerDragEventsToTarget(
        options.ownerDocument.defaultView,
        handlePointerMove,
        handlePointerEnd
      )
    : null;

  return (): void => {
    cleanupWindow?.();
    cleanupDocument();
  };
}

/**
 * Binds active drag continuation events to one capture target.
 *
 * @param target - Document or window receiving active pointer drag events.
 * @param handlePointerMove - Listener for pointer movement.
 * @param handlePointerEnd - Listener for pointer completion or cancellation.
 * @returns Cleanup function for listeners bound to this target.
 */
function bindMountedPointerDragEventsToTarget(
  target: EventTarget,
  handlePointerMove: EventListener,
  handlePointerEnd: EventListener
): () => void {
  target.addEventListener(
    "pointermove",
    handlePointerMove,
    mountedPointerDragDocumentListenerOptions
  );
  target.addEventListener(
    "pointerup",
    handlePointerEnd,
    mountedPointerDragDocumentListenerOptions
  );
  target.addEventListener(
    "pointercancel",
    handlePointerEnd,
    mountedPointerDragDocumentListenerOptions
  );

  return (): void => {
    target.removeEventListener(
      "pointermove",
      handlePointerMove,
      mountedPointerDragDocumentListenerOptions
    );
    target.removeEventListener(
      "pointerup",
      handlePointerEnd,
      mountedPointerDragDocumentListenerOptions
    );
    target.removeEventListener(
      "pointercancel",
      handlePointerEnd,
      mountedPointerDragDocumentListenerOptions
    );
  };
}
