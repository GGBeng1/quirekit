import type {
  QuireMountedTableChromeAnchor,
  QuireMountedTableChromeFragment,
  QuireMountedTableChromeModel
} from "@quirekit/core";
import { ref } from "vue";
import { clampEditorUITableResizeDelta } from "./constraints";
import type {
  EditorUITableAxis,
  EditorUITableResizeController,
  EditorUITableResizeRequest
} from "./types";

type CapturedResizeSession = Readonly<{
  pointerId: number;
  axis: EditorUITableAxis;
  index: number;
  startCoordinate: number;
  initialSize: number;
  sourceSize: number;
  scale: number;
  boundaryPosition: number;
  tableRect: QuireMountedTableChromeFragment["tableRect"];
  element: HTMLElement;
}>;

/**
 * Creates pointer-captured preview state for Table row and column resizing.
 *
 * @returns Resize controller with explicit start, update, finish, and cancel phases.
 */
export function createEditorUITableResizeController(): EditorUITableResizeController {
  const preview = ref<EditorUITableResizeController["preview"]["value"]>(
    null
  );
  let session: CapturedResizeSession | null = null;

  /**
   * Captures one resize handle and initializes its zero-delta guide.
   *
   * @param event - Initial pointer event.
   * @param anchor - Mounted resize anchor.
   * @param fragment - Active page-local fragment.
   * @param sizing - Unscaled source-flow measurements from the same mounted model.
   */
  function start(
    event: PointerEvent,
    anchor: QuireMountedTableChromeAnchor,
    fragment: QuireMountedTableChromeFragment,
    sizing: QuireMountedTableChromeModel["sizing"]
  ): void {
    const axis = anchor.kind === "resize-row"
      ? "row"
      : anchor.kind === "resize-column"
        ? "column"
        : null;
    const index = axis === "row" ? anchor.rowIndex : anchor.columnIndex;
    const item = axis === "row"
      ? fragment.rows.find((row) => row.rowIndex === index)
      : fragment.columns.find((column) => column.columnIndex === index);
    const element = event.currentTarget;
    if (
      axis === null
      || index === undefined
      || item === undefined
      || !(element instanceof HTMLElement)
    ) {
      return;
    }

    const sourceSize = axis === "row" ? sizing?.rowHeights[index] : sizing?.columnWidths[index];
    const scale = sizing === undefined ? NaN : (fragment.tableRect.right - fragment.tableRect.left) / sizing.width;
    if (sourceSize === undefined || !Number.isFinite(scale) || scale <= 0) return;
    const initialSize = axis === "row"
      ? item.rect.bottom - item.rect.top
      : item.rect.right - item.rect.left;
    const boundaryPosition = axis === "row"
      ? anchor.rect.top
      : anchor.rect.left;
    session = {
      pointerId: event.pointerId,
      axis,
      index,
      startCoordinate: axis === "row" ? event.clientY : event.clientX,
      initialSize,
      sourceSize,
      scale,
      boundaryPosition,
      tableRect: fragment.tableRect,
      element
    };
    element.setPointerCapture(event.pointerId);
    element.ownerDocument.addEventListener("keydown", cancelOnEscape, true);
    updatePreview(0);
  }

  /**
   * Updates the preview guide for the captured pointer.
   *
   * @param event - Captured pointer movement.
   */
  function update(event: PointerEvent): void {
    if (session === null || session.pointerId !== event.pointerId) {
      return;
    }
    const coordinate = session.axis === "row"
      ? event.clientY
      : event.clientX;
    updatePreview(coordinate - session.startCoordinate);
  }

  /**
   * Finishes the captured resize and returns its semantic size request.
   *
   * @param event - Captured pointer release.
   * @returns Final request, or null when the event does not own the session.
   */
  function finish(event: PointerEvent): EditorUITableResizeRequest | null {
    if (session === null || session.pointerId !== event.pointerId) {
      return null;
    }
    update(event);
    const current = preview.value;
    releaseSession();
    return current === null
      ? null
      : { axis: current.axis, index: current.index, size: current.size };
  }

  /**
   * Cancels a captured resize without committing document state.
   *
   * @param event - Optional pointer event used to validate ownership.
   */
  function cancel(event?: PointerEvent): void {
    if (
      session !== null
      && (event === undefined || event.pointerId === session.pointerId)
    ) {
      releaseSession();
    }
  }

  /**
   * Recomputes the clamped preview from raw pointer movement.
   *
   * @param rawDelta - Raw pointer movement in CSS pixels.
   */
  function updatePreview(rawDelta: number): void {
    if (session === null) {
      return;
    }
    const delta = clampEditorUITableResizeDelta(
      session.axis,
      session.initialSize,
      rawDelta,
      session.scale
    );
    preview.value = {
      axis: session.axis,
      index: session.index,
      // Apply viewport movement to the complete source row, including page continuations.
      size: session.sourceSize + delta / session.scale,
      delta,
      position: session.boundaryPosition + delta,
      tableRect: session.tableRect
    };
  }

  /** @param event - Document key owned by the active drag. */
  function cancelOnEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape" || session === null) return;
    event.preventDefault();
    event.stopPropagation();
    releaseSession();
  }

  /** Releases pointer capture and clears all preview-only state. */
  function releaseSession(): void {
    const current = session;
    session = null;
    preview.value = null;
    current?.element.ownerDocument.removeEventListener("keydown", cancelOnEscape, true);
    if (
      current !== null
      && current.element.hasPointerCapture(current.pointerId)
    ) {
      current.element.releasePointerCapture(current.pointerId);
    }
  }

  return { preview, start, update, finish, cancel };
}
