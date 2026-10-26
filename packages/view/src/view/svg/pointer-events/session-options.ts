import { resolveQuireHitTestSelectionTarget } from "@quirekit/view-engine";
import {
  bindMountedPointerSession,
  resolveMountedPointerEventTargets,
  type BindMountedPointerSessionOptions
} from "../../shared";
import { resolveSvgMountedCoordinateSurface } from "../dom";
import type {
  BindSvgMountedPointerEventsOptions,
  SvgMountedPointerRenderState
} from "./types";

/**
 * Adapts SVG geometry and surfaces to the shared pointer session.
 *
 * @param options - Mounted SVG pointer capabilities.
 * @returns Renderer-neutral pointer session options.
 */
export function createSvgMountedPointerSessionOptions(
  options: BindSvgMountedPointerEventsOptions
): BindMountedPointerSessionOptions {
  const coordinateSurface = resolveSvgMountedCoordinateSurface(options.elements);

  return {
    mountedView: options.mountedView,
    root: options.elements.root,
    coordinateSurface,
    cursorSurface: coordinateSurface,
    eventTargets: resolveMountedPointerEventTargets(
      options.elements.root,
      coordinateSurface
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
    hitTestPointer: (selectionOptions, renderState) => {
      const hitTestResult = options.hitTestPointer({
        clientPoint: selectionOptions.clientPoint,
        renderState: renderState as SvgMountedPointerRenderState,
        surfaceClientRect: selectionOptions.canvasClientRect
      });

      return {
        geometrySnapshot: selectionOptions.geometrySnapshot,
        hitTestResult,
        interactionTarget: resolveQuireHitTestSelectionTarget({ hitTestResult })
      };
    },
    onPointerHitTest: options.onPointerHitTest,
    useWidgetTargetCursor: true
  };
}

/**
 * Binds SVG through the canonical mounted pointer session.
 *
 * @param options - Mounted SVG pointer capabilities.
 * @returns Cleanup for the shared pointer session.
 */
export function bindSvgMountedPointerSession(
  options: BindSvgMountedPointerEventsOptions
): () => void {
  return bindMountedPointerSession(createSvgMountedPointerSessionOptions(options));
}
