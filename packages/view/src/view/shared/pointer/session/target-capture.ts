import type { QuireClientPoint } from "@quirekit/view-engine";
import type { MountedWidgetEventRuntime } from "../../widget-events";
import type { MountedPointerTargetCaptureDragState } from "../drag";
import type { MountedPointerSessionRenderState } from "./types";

/**
 * Redispatches one retained target capture through current mounted geometry.
 *
 * @param options - Captured pointer, current point, render state, and surface authority.
 * @returns Whether a current render state accepted the redispatch.
 */
export function dispatchMountedPointerTargetCapture(options: Readonly<{
  dragState: MountedPointerTargetCaptureDragState;
  clientPoint: QuireClientPoint;
  renderState: MountedPointerSessionRenderState | null;
  coordinateSurface: HTMLElement | SVGSVGElement;
  widgetEvents: MountedWidgetEventRuntime;
}>): boolean {
  if (!options.renderState) {
    return false;
  }

  options.widgetEvents.dispatchPointerEvent({
    type: "pointerMove",
    pointerId: options.dragState.pointerId,
    clientPoint: options.clientPoint,
    surfaceClientRect: options.coordinateSurface.getBoundingClientRect(),
    surfaceBounds: options.renderState.surfaceState.surfaceBounds
  });
  return true;
}
