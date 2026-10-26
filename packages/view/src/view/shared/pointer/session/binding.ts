import {
  createQuirePointerClickTracker,
  mapClientPointToQuirePoint
} from "@quirekit/view-engine";
import type { QuireClientPoint } from "@quirekit/view-engine";
import { createMountedPointerAutoScrollController } from "../auto-scroll";
import { readMountedViewScrollInset } from "../../scroll";
import {
  applyMountedPointerRangeSelection,
  resolveMountedPointerRangeEndpointHits
} from "../range-selection";
import {
  bindMountedPointerDragDocumentEvents,
  createMountedPointerDragFrameCoordinator,
  resolveMountedPointerDragHeadClientPoint
} from "../drag";
import {
  addMountedPointerEventListenerToTargets
} from "../targets";
import {
  addMountedPointerEventListener,
  tryReleaseMountedPointerCapture
} from "../dom";
import { bindMountedTouchTaps } from "../touch/tap";
import { preventMountedContextMenu } from "../start";
import { resolveMountedPointerCursorAtPoint } from "../cursor";
import { createMountedPointerSelectionOptions } from "../selection-options";
import { handleMountedPointerDown } from "./pointer-down";
import { dispatchMountedPointerTargetCapture } from "./target-capture";
import type {
  BindMountedPointerSessionOptions,
  MountedPointerSessionRenderState
} from "./types";
import type { MountedPointerDragState } from "../drag";
import { createMountedBlockPointerOwner, registerMountedBlockPointerOwner } from "../../block-interaction";
import type { QuireViewPointerHitTestResult } from "../../../types";

/**
 * Binds the canonical mounted pointer session shared by every view backend.
 *
 * @param options - Backend surface facts, hit-test capability, and shared hooks.
 * @returns Cleanup for surface and document-level pointer listeners.
 */
export function bindMountedPointerSession(
  options: BindMountedPointerSessionOptions
): () => void {
  const clickTracker = createQuirePointerClickTracker();
  const removeListeners: Array<() => void> = [];
  const handledPointerDownEvents = new WeakSet<Event>();
  const handledPointerMoveEvents = new WeakSet<Event>();
  let pointerDragState: MountedPointerDragState | null = null;
  let selectionDragReceivedMove = false;
  let removeDocumentDragListeners: (() => void) | null = null;
  const blockPointer = createMountedBlockPointerOwner(options, () => pointerDragState === null);
  removeListeners.push(registerMountedBlockPointerOwner(options.mountedView, blockPointer));

  /** Clears document-level continuation listeners for the active drag. */
  const clearDocumentDragListeners = (): void => {
    removeDocumentDragListeners?.();
    removeDocumentDragListeners = null;
  };

  /**
   * Resolves one point through the backend authority retained by this render.
   *
   * @param event - Browser point to hit-test.
   * @param renderState - Render products owning the event.
   * @returns Backend-normalized pointer hit.
   */
  const hitTestEvent = (
    event: { readonly clientX: number; readonly clientY: number },
    renderState: MountedPointerSessionRenderState
  ) => options.hitTestPointer(
    createMountedPointerSelectionOptions({
      geometrySnapshot: renderState.renderResult.interactionSnapshot,
      clientPoint: event,
      canvasClientRect: options.coordinateSurface.getBoundingClientRect(),
      surfaceBounds: renderState.surfaceState.surfaceBounds
    }),
    renderState
  );

  /**
   * Resolves the ordinary hover cursor at one mounted client point.
   *
   * @param clientPoint - Browser point whose current target owns the cursor.
   * @param renderState - Current geometry and retained interaction products.
   * @param pointerHit - Hit already resolved for this event, or resolved here for capture completion.
   * @returns CSS cursor for the mounted surface.
   */
  const resolveCursorAtPoint = (
    clientPoint: QuireClientPoint,
    renderState: MountedPointerSessionRenderState,
    pointerHit: QuireViewPointerHitTestResult = hitTestEvent(clientPoint, renderState)
  ): string => resolveMountedPointerCursorAtPoint(options, clientPoint, renderState.surfaceState.surfaceBounds, pointerHit);

  /**
   * Forwards one captured drawing-creation phase in document coordinates.
   *
   * @param phase - Captured pointer lifecycle phase.
   * @param event - Browser pointer event.
   * @param surfaceClientRect - Coordinate surface client rectangle.
   * @param surfaceBounds - Rendered surface bounds.
   */
  const forwardDrawingCreation = (
    phase: "update" | "end" | "cancel",
    event: PointerEvent,
    surfaceClientRect: DOMRect,
    surfaceBounds: MountedPointerSessionRenderState["surfaceState"]["surfaceBounds"]
  ): void => {
    options.handleDrawingCreationPointer?.({
      phase,
      shiftKey: event.shiftKey,
      pointerId: event.pointerId,
      clientPoint: event,
      point: mapClientPointToQuirePoint({ clientPoint: event, canvasClientRect: surfaceClientRect, surfaceBounds })
    });
  };

  /**
   * Re-resolves the moving end of the active text-range drag.
   *
   * @param clientPoint - Latest pointer target in client coordinates.
   * @param providedRenderState - Optional render state already read by the event path.
   * @returns Whether an active text-range drag was updated.
   */
  const applyActivePointerRangeSelection = (
    clientPoint: QuireClientPoint,
    providedRenderState?: MountedPointerSessionRenderState | undefined
  ): boolean => {
    const dragState = pointerDragState;

    if (
      !dragState
      || dragState.kind === "target-capture"
      || dragState.kind === "drawing-creation"
    ) {
      return false;
    }

    const renderState = providedRenderState ?? options.getRenderState();
    if (!renderState) {
      return false;
    }

    const surfaceClientRect = options.coordinateSurface.getBoundingClientRect();
    const surfaceBounds = renderState.surfaceState.surfaceBounds;
    const headClientPoint = resolveMountedPointerDragHeadClientPoint({
      root: options.root,
      clientPoint,
      surfaceClientRect,
      surfaceBounds,
      viewportRect: renderState.renderResult.layoutSnapshot.viewportRect
    });

    const result = applyMountedPointerRangeSelection({
      mountedView: options.mountedView,
      geometrySnapshot: renderState.renderResult.interactionSnapshot,
      ...resolveMountedPointerRangeEndpointHits({
        hitTestPointer: (selectionOptions) =>
          options.hitTestPointer(selectionOptions, renderState),
        anchorHitTestResult: dragState.anchorHitTestResult,
        headClientPoint,
        canvasClientRect: surfaceClientRect,
        surfaceBounds,
        geometrySnapshot: renderState.renderResult.interactionSnapshot
      }),
      setInteractionTarget: options.setInteractionTarget,
      setSelectionGeometryContext: options.setSelectionGeometryContext,
      onPointerHitTest: options.onPointerHitTest,
      renderSelection: () => options.renderSelection("request")
    });
    if (result.updated) {
      // A range-changing drag is not a click. Reset before the browser can
      // carry its DOM click detail into the user's next precision adjustment.
      clickTracker.reset();
    }
    return result.updated;
  };

  /**
   * Redispatches one retained target-capture point through current geometry.
   *
   * @param clientPoint - Latest captured pointer point in client coordinates.
   * @param providedRenderState - Optional current render products from the caller.
   * @returns Whether an active target capture consumed the point.
   */
  const applyActivePointerTargetCapture = (
    clientPoint: QuireClientPoint,
    providedRenderState?: MountedPointerSessionRenderState | undefined
  ): boolean => {
    const dragState = pointerDragState;
    if (dragState?.kind !== "target-capture") {
      return false;
    }
    return dispatchMountedPointerTargetCapture({
      dragState,
      clientPoint,
      renderState: providedRenderState ?? options.getRenderState(),
      coordinateSurface: options.coordinateSurface,
      widgetEvents: options.widgetEvents
    });
  };

  // Active text dragging is the high-frequency path. Retain only the latest
  // client point per frame, then resolve it against the render products current
  // at execution time so pagination or auto-scroll cannot make queued geometry stale.
  const pointerDragFrame = createMountedPointerDragFrameCoordinator({
    root: options.root,
    applyPoint: (clientPoint) => {
      applyActivePointerRangeSelection(clientPoint);
    },
    ...(options.requestPointerDragFrame === undefined
      ? {}
      : { requestFrame: options.requestPointerDragFrame }),
    ...(options.cancelPointerDragFrame === undefined
      ? {}
      : { cancelFrame: options.cancelPointerDragFrame })
  });

  const pointerAutoScroll = (
    options.createPointerAutoScrollController
    ?? createMountedPointerAutoScrollController
  )({
    root: options.root,
    edgeThreshold: readMountedViewScrollInset(
      options.mountedView,
      "scrollThreshold",
      40
    ),
    /**
     * Re-hit-tests the retained target only after the scroll ancestor moved.
     *
     * @param clientPoint - Retained moving-end target in client coordinates.
     */
    onScrollFrame(clientPoint): void {
      if (!applyActivePointerTargetCapture(clientPoint)) {
        pointerDragFrame.update(clientPoint, true);
        // Auto-scroll already waited for current geometry on this frame. Do
        // not add another frame of lag before applying the stationary point.
        pointerDragFrame.flush();
      }
    }
  });

  /**
   * Handles hover diagnostics and active drag selection.
   *
   * @param event - Browser pointermove event.
   */
  const handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType === "touch") return;
    if (blockPointer.active()) return;
    if (options.stopEvent?.(event) || handledPointerMoveEvents.has(event)) {
      return;
    }

    handledPointerMoveEvents.add(event);
    // Plugin DOM-event props own editor semantics such as transient content-control
    // hover. Route the exact browser event before backend cursor diagnostics so
    // Canvas and SVG honor the same contract as the native DOM view.
    if (options.mountedView.dispatchEvent(event)) {
      pointerAutoScroll.stop();
      return;
    }
    const renderState = options.getRenderState();

    if (!renderState) {
      pointerAutoScroll.stop();
      return;
    }

    if (options.isDrawingCreationActive?.() === true) {
      options.cursorSurface.style.cursor = "crosshair";
    }

    const surfaceClientRect = options.coordinateSurface.getBoundingClientRect();
    const surfaceBounds = renderState.surfaceState.surfaceBounds;
    if (
      pointerDragState?.kind === "drawing-creation"
      && pointerDragState.pointerId === event.pointerId
    ) {
      forwardDrawingCreation("update", event, surfaceClientRect, surfaceBounds);
      event.preventDefault();
      pointerAutoScroll.stop();
      return;
    }
    const widgetDispatch = options.widgetEvents.dispatchPointerEvent({
      type: "pointerMove",
      pointerId: event.pointerId,
      clientPoint: event,
      surfaceClientRect,
      surfaceBounds,
      nativeEvent: event
    });

    const ownsTargetCapture = pointerDragState?.kind === "target-capture"
      && pointerDragState.pointerId === event.pointerId;
    if (widgetDispatch.defaultPrevented) {
      if (ownsTargetCapture) {
        pointerAutoScroll.update(event);
      } else {
        pointerAutoScroll.stop();
      }
      return;
    }

    if (ownsTargetCapture) {
      event.preventDefault();
      pointerAutoScroll.update(event);
      return;
    }

    if (
      pointerDragState &&
      pointerDragState.pointerId === event.pointerId &&
      pointerDragState.kind !== "target-capture"
      && pointerDragState.kind !== "drawing-creation"
    ) {
      event.preventDefault();
      selectionDragReceivedMove = true;
      pointerDragFrame.update(event);
      pointerAutoScroll.update(event);
      return;
    }

    const pointerHit = hitTestEvent(event, renderState);
    options.cursorSurface.style.cursor =
      options.isDrawingCreationActive?.() === true
        ? "crosshair"
        : resolveCursorAtPoint(event, renderState, pointerHit);
    options.onPointerHitTest(pointerHit.hitTestResult);
  };

  /**
   * Ends one pointer drag or retained target-capture session.
   *
   * @param event - Browser pointerup or pointercancel event.
   */
  const handlePointerEnd = (event: PointerEvent): void => {
    if (options.stopEvent?.(event)) {
      return;
    }
    if (!pointerDragState || pointerDragState.pointerId !== event.pointerId) {
      return;
    }
    const endedDragState = pointerDragState;

    // Pointerup is a durability boundary: commit its exact coordinate even
    // when the animation frame for the preceding move has not executed yet.
    // Cancellation instead discards queued movement without mutating selection.
    if (pointerDragState.kind === "selection-anchor") {
      if (event.type === "pointercancel") {
        pointerDragFrame.cancel();
      } else if (
        selectionDragReceivedMove
        || event.clientX !== pointerDragState.pressClientPoint.clientX
        || event.clientY !== pointerDragState.pressClientPoint.clientY
      ) {
        // A real movement must commit its final coordinate synchronously. A
        // stationary click keeps the pointerdown selection because a selection
        // repaint may already have published different page geometry.
        pointerDragFrame.update(event);
        pointerDragFrame.flush();
      } else {
        pointerDragFrame.cancel();
      }
    }

    const renderState = options.getRenderState();
    if (renderState) {
      const surfaceClientRect = options.coordinateSurface.getBoundingClientRect();
      const surfaceBounds = renderState.surfaceState.surfaceBounds;
      if (pointerDragState.kind === "drawing-creation") {
        forwardDrawingCreation(event.type === "pointercancel" ? "cancel" : "end", event, surfaceClientRect, surfaceBounds);
      } else {
        options.widgetEvents.dispatchPointerEvent({
          type: event.type === "pointercancel" ? "pointerCancel" : "pointerUp",
          pointerId: event.pointerId,
          clientPoint: event,
          surfaceClientRect,
          surfaceBounds,
          nativeEvent: event
        });
      }
    }

    tryReleaseMountedPointerCapture(options.coordinateSurface, event.pointerId);
    pointerAutoScroll.stop();
    pointerDragState = null;
    selectionDragReceivedMove = false;
    clearDocumentDragListeners();
    if (
      endedDragState.kind === "target-capture"
      && endedDragState.captureCursor !== undefined
      && renderState
    ) {
      options.cursorSurface.style.cursor = resolveCursorAtPoint(event, renderState);
    } else if (
      endedDragState.kind === "target-capture"
      && endedDragState.captureCursor !== undefined
    ) {
      options.cursorSurface.style.cursor = "";
    } else if (endedDragState.kind === "drawing-creation" && renderState) {
      options.cursorSurface.style.cursor =
        options.isDrawingCreationActive?.() === true
          ? "crosshair"
          : resolveCursorAtPoint(event, renderState);
    } else if (endedDragState.kind === "drawing-creation") {
      options.cursorSurface.style.cursor =
        options.isDrawingCreationActive?.() === true ? "crosshair" : "";
    }
    if (
      event.type === "pointerup"
      && endedDragState.kind === "selection-anchor"
    ) {
      options.mountedView.dispatchEvent(event);
    }
  };

  /**
   * Starts a drag and binds document-level continuation events.
   *
   * @param state - Active pointer drag or target-capture state.
   */
  const startPointerDrag = (state: MountedPointerDragState): void => {
    pointerAutoScroll.stop();
    pointerDragFrame.cancel();
    pointerDragState = state;
    selectionDragReceivedMove = false;
    if (
      state.kind === "target-capture"
      && state.captureCursor !== undefined
    ) {
      options.cursorSurface.style.cursor = state.captureCursor;
    } else if (state.kind === "drawing-creation") {
      options.cursorSurface.style.cursor = "crosshair";
    }
    clearDocumentDragListeners();
    removeDocumentDragListeners = bindMountedPointerDragDocumentEvents({
      ownerDocument: options.root.ownerDocument,
      handlePointerMove,
      handlePointerEnd
    });
  };

  /**
   * Starts selection, plugin click, or retained target dispatch.
   *
   * @param event - Browser pointerdown event.
   */
  const handlePointerDown = (event: PointerEvent): void => {
    if (blockPointer.active()) return;
    if (options.stopEvent?.(event) || handledPointerDownEvents.has(event)) {
      return;
    }

    handledPointerDownEvents.add(event);
    const renderState = options.getRenderState();

    if (!renderState) {
      return;
    }

    handleMountedPointerDown({
      bindingOptions: options,
      event,
      // The mounted tracker is the semantic authority because every backend
      // presents the complete document as one DOM event target. Native detail
      // cannot distinguish a completed canvas drag from a true click series.
      clickCount: clickTracker.resolveClickCount({
        clientX: event.clientX,
        clientY: event.clientY,
        timeStamp: event.timeStamp
      }),
      renderState,
      setPointerDragState: startPointerDrag
    });
  };

  /**
   * Clears plugin and backend hover state when no pointer session remains active.
   *
   * @param event - Browser pointerleave event leaving the mounted editor surface.
   */
  const handlePointerLeave = (event: PointerEvent): void => {
    options.mountedView.dispatchEvent(event);
    if (pointerDragState) {
      return;
    }

    if (options.clearCursorOnLeave === true) {
      options.cursorSurface.style.cursor = "";
    }
    options.onPointerHitTest({ kind: "miss" });
  };

  /** @param type - Event type. @param listener - Listener added to every event target. */
  const listen = (type: string, listener: (event: PointerEvent) => void): void =>
    addMountedPointerEventListenerToTargets(removeListeners, options.eventTargets, type, listener as EventListener);
  listen("pointermove", handlePointerMove);
  // Touch presses are routed through tap recognition instead of pointerdown.
  listen("pointerdown", (event) => { if (event.pointerType !== "touch") handlePointerDown(event); });
  removeListeners.push(bindMountedTouchTaps({
    ownerDocument: options.root.ownerDocument,
    targets: options.eventTargets,
    ignore: options.stopEvent,
    tap(event) { handlePointerDown(event); handlePointerEnd(event); }
  }));
  listen("pointerup", handlePointerEnd);
  listen("pointercancel", handlePointerEnd);
  addMountedPointerEventListener(
    removeListeners,
    options.leaveTarget,
    "pointerleave",
    handlePointerLeave as EventListener
  );
  listen("contextmenu", preventMountedContextMenu as (event: PointerEvent) => void);

  return () => {
    pointerAutoScroll.stop();
    pointerDragFrame.cancel();
    if (
      pointerDragState?.kind === "target-capture"
      && pointerDragState.captureCursor !== undefined
    ) {
      options.cursorSurface.style.cursor = "";
    } else if (pointerDragState?.kind === "drawing-creation") {
      options.cursorSurface.style.cursor = "";
    }
    clearDocumentDragListeners();
    for (const removeListener of removeListeners.splice(0)) {
      removeListener();
    }
  };
}
