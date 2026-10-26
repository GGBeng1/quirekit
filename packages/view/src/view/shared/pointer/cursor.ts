import { mapClientPointToQuirePoint, type QuireClientPoint } from "@quirekit/view-engine";
import type { QuireViewPointerHitTestResult } from "../../types";
import type { BindMountedPointerSessionOptions, MountedPointerSessionRenderState } from "./session/types";
import type { ResolveMountedPointerCursorOptions } from "./types";

/**
 * Resolves the CSS cursor for a mounted editor surface from the region under a point.
 *
 * A target-declared cursor wins, then object ownership takes precedence over its
 * accompanying caret position. Editable text uses the I-beam.
 *
 * @param options - Target cursor, content-hit, and editability inputs.
 * @returns CSS cursor value, where an empty string falls back to the default cursor.
 */
export function resolveMountedPointerCursor(
  options: ResolveMountedPointerCursorOptions
): string {
  if (options.targetCursor !== undefined) {
    return options.targetCursor;
  }

  if (options.overObject === true) {
    return options.editable ? "move" : "default";
  }

  if (options.editable && options.overContent) {
    return "text";
  }

  return "";
}

/**
 * Resolves the hover cursor at one client point from widget targets and the pointer hit.
 *
 * @param options - Pointer session surfaces, widget runtime, and mounted view.
 * @param clientPoint - Browser point whose current target owns the cursor.
 * @param surfaceBounds - Rendered surface bounds for client-to-document mapping.
 * @param pointerHit - Hit resolved for the same point.
 * @returns CSS cursor for the mounted surface.
 */
export function resolveMountedPointerCursorAtPoint(
  options: Pick<BindMountedPointerSessionOptions, "coordinateSurface" | "useWidgetTargetCursor" | "widgetEvents" | "mountedView">,
  clientPoint: QuireClientPoint,
  surfaceBounds: MountedPointerSessionRenderState["surfaceState"]["surfaceBounds"],
  pointerHit: QuireViewPointerHitTestResult
): string {
  const targetCursor = options.useWidgetTargetCursor === true
    ? options.widgetEvents.hitTestPoint(mapClientPointToQuirePoint({
        clientPoint,
        canvasClientRect: options.coordinateSurface.getBoundingClientRect(),
        surfaceBounds
      }))?.target.cursor
    : undefined;
  return resolveMountedPointerCursor({
    ...(targetCursor === undefined ? {} : { targetCursor }),
    overObject: pointerHit.interactionTarget?.domain === "object",
    overContent: pointerHit.hitTestResult.kind === "position",
    editable: options.mountedView.editable
  });
}
