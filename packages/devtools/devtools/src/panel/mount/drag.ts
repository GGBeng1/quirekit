import {
  isElement,
  isEventTarget
} from "./dom";
import {
  clampPanelOffset,
  renderPanelOffsetTransform,
  type QuireDevtoolsPanelOffset
} from "./offset";

/** Controller for dragging the devtools panel. */
export interface QuireDevtoolsPanelDragController {
  /** Current panel offset. */
  readonly offset: QuireDevtoolsPanelOffset;
  /**
   * Starts a drag when the pointer event begins on the drag handle.
   *
   * @param event - Pointer event from the mounted root.
   */
  handlePointerDown(event: Event): void;
  /** Removes document-level drag listeners. */
  destroy(): void;
}

/** Options used to create a panel drag controller. */
export interface QuireDevtoolsPanelDragControllerOptions {
  /** Root element that contains the rendered panel. */
  readonly root: HTMLElement;
  /** Owner document used for pointer move/up listeners. */
  readonly ownerDocument: Document | undefined;
}

/** Active drag gesture state. */
interface PanelDragState {
  /** Pointer x coordinate at drag start. */
  readonly startClientX: number;
  /** Pointer y coordinate at drag start. */
  readonly startClientY: number;
  /** Panel x offset at drag start. */
  readonly startOffsetX: number;
  /** Panel y offset at drag start. */
  readonly startOffsetY: number;
}

/**
 * Creates a drag controller for the devtools panel.
 *
 * @param options - Drag controller options.
 * @returns Panel drag controller.
 */
export function createPanelDragController(
  options: QuireDevtoolsPanelDragControllerOptions
): QuireDevtoolsPanelDragController {
  let offset: QuireDevtoolsPanelOffset = { x: 0, y: 0 };
  let dragState: PanelDragState | undefined;

  const onPointerMove = (event: Event) => {
    if (!dragState) {
      return;
    }

    const pointerEvent = event as PointerEvent;
    offset = clampPanelOffset({
      x: dragState.startOffsetX + pointerEvent.clientX - dragState.startClientX,
      y: dragState.startOffsetY + pointerEvent.clientY - dragState.startClientY
    }, options.ownerDocument);
    applyPanelOffset(options.root, offset);
  };
  const onPointerUp = () => {
    dragState = undefined;
    removeDocumentListeners(options.ownerDocument, onPointerMove, onPointerUp);
  };

  return {
    get offset() {
      return offset;
    },
    handlePointerDown: (event: Event) => {
      if (!isDragHandle(event.target)) {
        return;
      }

      const pointerEvent = event as PointerEvent;
      event.preventDefault();
      dragState = {
        startClientX: pointerEvent.clientX,
        startClientY: pointerEvent.clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y
      };
      addDocumentListeners(options.ownerDocument, onPointerMove, onPointerUp);
    },
    destroy: () => {
      dragState = undefined;
      removeDocumentListeners(options.ownerDocument, onPointerMove, onPointerUp);
    }
  };
}

/**
 * Checks whether an event target is inside the drag handle.
 *
 * @param target - Event target.
 * @returns True when dragging should start.
 */
function isDragHandle(target: EventTarget | null): boolean {
  if (!isElement(target)) {
    return false;
  }

  const dragHandle = target.closest("[data-qk-devtools-drag-handle]");

  if (!dragHandle) {
    return false;
  }

  if (target.closest(".qk-devtools-drag-handle")) {
    return true;
  }

  return target.closest(
    "button,input,select,textarea,a,[data-qk-devtools-action]"
  ) === null;
}

/**
 * Applies panel offset directly without re-rendering the whole panel.
 *
 * @param root - Mounted root.
 * @param offset - Offset to apply.
 */
function applyPanelOffset(root: HTMLElement, offset: QuireDevtoolsPanelOffset): void {
  const panel = root.querySelector<HTMLElement>(".qk-devtools-panel");

  if (panel) {
    panel.style.transform = renderPanelOffsetTransform(offset);
  }
}

/**
 * Adds document listeners for an active drag.
 *
 * @param ownerDocument - Owner document.
 * @param onPointerMove - Pointer move listener.
 * @param onPointerUp - Pointer up listener.
 */
function addDocumentListeners(
  ownerDocument: Document | undefined,
  onPointerMove: (event: Event) => void,
  onPointerUp: (event: Event) => void
): void {
  if (!isEventTarget(ownerDocument)) {
    return;
  }

  ownerDocument.addEventListener("pointermove", onPointerMove);
  ownerDocument.addEventListener("pointerup", onPointerUp);
  ownerDocument.addEventListener("pointercancel", onPointerUp);
}

/**
 * Removes document listeners for an active drag.
 *
 * @param ownerDocument - Owner document.
 * @param onPointerMove - Pointer move listener.
 * @param onPointerUp - Pointer up listener.
 */
function removeDocumentListeners(
  ownerDocument: Document | undefined,
  onPointerMove: (event: Event) => void,
  onPointerUp: (event: Event) => void
): void {
  if (!isEventTarget(ownerDocument)) {
    return;
  }

  ownerDocument.removeEventListener("pointermove", onPointerMove);
  ownerDocument.removeEventListener("pointerup", onPointerUp);
  ownerDocument.removeEventListener("pointercancel", onPointerUp);
}
