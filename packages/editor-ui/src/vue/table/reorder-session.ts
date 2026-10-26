import type {
  QuireMountedTableChromeAnchor,
  QuireMountedTableChromeFragment
} from "@quirekit/core";
import { ref } from "vue";
import type {
  EditorUITableMoveController,
  EditorUITableMoveSource
} from "./types";
import {
  createEditorUITableMoveRequestFromPreview,
  resolveNearestEditorUITableMoveBoundary
} from "./reorder-target";

const reorderDragThreshold = 4;

type CapturedMoveSession = Readonly<{
  pointerId: number;
  source: EditorUITableMoveSource;
  startCoordinate: number;
  coordinateOffset: number;
  boundaries: readonly QuireMountedTableChromeAnchor[];
  tableRect: QuireMountedTableChromeFragment["tableRect"];
  element: HTMLElement;
}>;

/**
 * Creates pointer-captured preview state for selected row/column reordering.
 *
 * @returns Move controller with explicit start, update, finish, and cancel phases.
 */
export function createEditorUITableMoveController(): EditorUITableMoveController {
  const preview = ref<EditorUITableMoveController["preview"]["value"]>(
    null
  );
  let session: CapturedMoveSession | null = null;

  /**
   * Captures one selected axis bar without yet entering drag state.
   *
   * @param event - Initial pointer event.
   * @param source - Structurally selected source range.
   * @param fragment - Active page-local Table fragment.
   */
  function start(
    event: PointerEvent,
    source: EditorUITableMoveSource,
    fragment: QuireMountedTableChromeFragment
  ): void {
    const element = event.currentTarget;
    if (!(element instanceof HTMLElement)) {
      return;
    }
    const boundaryKind = source.axis === "row"
      ? "insert-row"
      : "insert-column";
    const boundaries = fragment.insertions.filter(
      (anchor) => anchor.kind === boundaryKind
        && anchor.boundaryIndex !== undefined
    );
    if (boundaries.length === 0) {
      return;
    }
    const coordinateOffset = resolveLocalPointerOffset(
      element,
      source.axis
    );
    session = {
      pointerId: event.pointerId,
      source,
      startCoordinate:
        readPointerCoordinate(event, source.axis) + coordinateOffset,
      coordinateOffset,
      boundaries,
      tableRect: fragment.tableRect,
      element
    };
    element.setPointerCapture(event.pointerId);
    element.ownerDocument.addEventListener("keydown", escape, true);
  }

  /**
   * Updates the nearest target boundary after the drag threshold is crossed.
   *
   * @param event - Captured pointer movement.
   */
  function update(event: PointerEvent): void {
    if (session === null || session.pointerId !== event.pointerId) {
      return;
    }
    const coordinate = readPointerCoordinate(event, session.source.axis)
      + session.coordinateOffset;
    if (
      preview.value === null
      && Math.abs(coordinate - session.startCoordinate) < reorderDragThreshold
    ) {
      return;
    }
    const boundary = resolveNearestEditorUITableMoveBoundary(
      session.boundaries,
      coordinate,
      session.source.axis
    );
    if (boundary?.boundaryIndex === undefined) {
      return;
    }
    preview.value = {
      ...session.source,
      targetIndex: boundary.boundaryIndex,
      position: session.source.axis === "row"
        ? boundary.rect.top
        : boundary.rect.left,
      tableRect: session.tableRect
    };
  }

  /**
   * Finishes the captured gesture and filters no-op target boundaries.
   *
   * @param event - Captured pointer release.
   * @returns Drag result, or null when the event does not own the session.
   */
  function finish(
    event: PointerEvent
  ): ReturnType<EditorUITableMoveController["finish"]> {
    if (session === null || session.pointerId !== event.pointerId) {
      return null;
    }
    update(event);
    const current = preview.value;
    const request = current === null
      ? null
      : createEditorUITableMoveRequestFromPreview(current);
    const didDrag = current !== null;
    releaseSession();

    return { didDrag, request };
  }

  /**
   * Cancels a captured reorder without committing document state.
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

  /** @param event - Escape cancels the captured reorder without changing source. */
  function escape(event: KeyboardEvent): void { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); } }

  /** Releases pointer capture and clears all preview-only state. */
  function releaseSession(): void {
    const current = session;
    session = null;
    current?.element.ownerDocument.removeEventListener("keydown", escape, true);
    preview.value = null;
    if (
      current !== null
      && current.element.hasPointerCapture(current.pointerId)
    ) {
      current.element.releasePointerCapture(current.pointerId);
    }
  }

  return { preview, start, update, finish, cancel };
}

/**
 * Reads the pointer coordinate for one active axis.
 *
 * @param event - Pointer event to inspect.
 * @param axis - Row or column axis.
 * @returns Viewport coordinate on the axis.
 */
function readPointerCoordinate(
  event: PointerEvent,
  axis: EditorUITableMoveSource["axis"]
): number {
  return axis === "row" ? event.clientY : event.clientX;
}

/**
 * Maps viewport pointer coordinates into the bar's positioned coordinate space.
 *
 * @param element - Axis bar that initiated the captured gesture.
 * @param axis - Row or column axis.
 * @returns Offset added to subsequent viewport pointer coordinates.
 */
function resolveLocalPointerOffset(
  element: HTMLElement,
  axis: EditorUITableMoveSource["axis"]
): number {
  const bounds = element.getBoundingClientRect();
  const localStart = Number.parseFloat(
    axis === "row" ? element.style.top : element.style.left
  );
  const viewportStart = axis === "row" ? bounds.top : bounds.left;
  return Number.isFinite(localStart) ? localStart - viewportStart : 0;
}
