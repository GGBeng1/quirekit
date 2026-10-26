import {
  bindMountedPointerSession,
  resolveMountedPointerEventTargets,
  type BindMountedPointerSessionOptions
} from "../../shared";
import type { BindCanvasMountedPointerEventsOptions } from "./types";

/**
 * Adapts Canvas surface and hit-test capabilities to the shared pointer session.
 *
 * @param options - Mounted Canvas pointer capabilities.
 * @returns Renderer-neutral pointer session options.
 */
export function createCanvasMountedPointerSessionOptions(
  options: BindCanvasMountedPointerEventsOptions
): BindMountedPointerSessionOptions {
  return {
    mountedView: options.mountedView,
    root: options.elements.root,
    coordinateSurface: options.elements.coordinateSurface,
    cursorSurface: options.elements.coordinateSurface,
    eventTargets: resolveMountedPointerEventTargets(
      options.elements.root,
      options.elements.coordinateSurface
    ),
    leaveTarget: options.elements.root,
    widgetEvents: options.widgetEvents,
    getRenderState: options.getRenderState,
    getInputBinding: options.getInputBinding,
    getInteractionTarget: options.getInteractionTarget ?? (() => null),
    focus: options.focus,
    renderSelection: options.renderSelection,
    setInteractionTarget: options.setInteractionTarget,
    setSelectionGeometryContext: options.setSelectionGeometryContext,
    prepareHeaderFooterPointerSelection:
      options.prepareHeaderFooterPointerSelection,
    handleDrawingCreationPointer: options.handleDrawingCreationPointer,
    isDrawingCreationActive: options.isDrawingCreationActive,
    hitTestPointer: (selectionOptions) =>
      options.canvasView.hitTestPointer(selectionOptions),
    onPointerHitTest: options.onPointerHitTest,
    useWidgetTargetCursor: true
  };
}

/**
 * Binds Canvas through the canonical mounted pointer session.
 *
 * @param options - Mounted Canvas pointer capabilities.
 * @returns Cleanup for the shared pointer session.
 */
export function bindCanvasMountedPointerSession(
  options: BindCanvasMountedPointerEventsOptions
): () => void {
  return bindMountedPointerSession(
    createCanvasMountedPointerSessionOptions(options)
  );
}
